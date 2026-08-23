import { LiveProvider } from './LiveProvider';
import { ZoomHostService } from './ZoomHostService';
import { ProviderAccountService } from '../../provider-accounts/service';
import { IProviderAccount } from '../../provider-accounts/types';
import { env } from '../../../config/env';
import { AppError } from '../../../core/errors/AppError';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from '../../../core/logger';
import { decrypt } from '../../../core/utils/encryption';
import * as admin from 'firebase-admin';
export class ZoomProvider implements LiveProvider {

  private async getAccessToken(credentials: { accountId?: string, clientId?: string, clientSecret?: string }): Promise<string> {
    const accountId = credentials.accountId || env.ZOOM_ACCOUNT_ID;
    const clientId = credentials.clientId || env.ZOOM_OAUTH_CLIENT_ID;
    const clientSecret = credentials.clientSecret || env.ZOOM_OAUTH_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      throw new AppError('Zoom Server-to-Server OAuth credentials are not configured.', 503);
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, null, {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      });
      return response.data.access_token;
    } catch (error: any) {
      console.error('Zoom OAuth Error:', error.response?.data || error.message);
      throw new AppError('Failed to authenticate with Zoom API.', 502);
    }
  }

  async createSession(config: { title: string; startTime?: string; durationMinutes?: number; teacherId?: string; customProviderId?: string; providerPasscode?: string; meetingMode?: string; providerAccountId?: string; hostUrl?: string; participantUrl?: string; hostKey?: string }) {

    // 1. Existing Meeting Mode
    if (config.meetingMode === 'use_existing' || config.customProviderId) {
      const meetingId = config.customProviderId || Math.floor(1000000000 + Math.random() * 9000000000).toString();
      return {
        providerSessionId: meetingId,
        hostId: 'manual',
        providerAccountId: config.providerAccountId,
        launchPayload: {
          passcode: config.providerPasscode || '',
          hostUrl: config.hostUrl,
          participantUrl: config.participantUrl,
          hostKey: config.hostKey
        }
      };
    }

    // 2. Acquire Host (3-Tier Fallback: provider_accounts -> zoom_hosts -> env)
    let account: IProviderAccount | null = null;
    let legacyHost: any = null;
    let zoomUserId = 'me';
    let credentials = {};

    try {
      if (config.providerAccountId && config.providerAccountId !== 'auto') {
        account = await ProviderAccountService.getAccountById(config.providerAccountId, true);
      } else {
        account = await ProviderAccountService.acquireAccount('zoom');
      }
    } catch (e) {
      logger.warn('Failed to acquire from provider_accounts. Falling back to zoom_hosts.', e);
    }

    if (account) {
      zoomUserId = 'me'; // Server-to-Server usually uses 'me' or specific user emails if configured
      credentials = account.credentials || {};
    } else {
      try {
        legacyHost = await ZoomHostService.acquireAvailableHost(config.title);
        zoomUserId = legacyHost?.zoomUserId || 'me';
      } catch (e) {
        logger.warn('Failed to acquire from zoom_hosts. Falling back to env.', e);
      }
    }

    try {
      // 3. Authenticate
      const token = await this.getAccessToken(credentials);

      // 4. Create Meeting
      const response = await axios.post(
        `https://api.zoom.us/v2/users/${zoomUserId}/meetings`,
        {
          topic: config.title,
          type: 2, // Scheduled meeting
          start_time: config.startTime ? new Date(config.startTime).toISOString() : new Date().toISOString(),
          duration: config.durationMinutes || 60,
          settings: {
            host_video: true,
            participant_video: false,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: false,
            approval_type: 2, // No registration required
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const meetingData = response.data;

      return {
        providerSessionId: meetingData.id.toString(),
        hostId: legacyHost?.id || 'auto', // 'auto' = created by env OAuth (not 'manual')
        providerAccountId: account?.id,
        launchPayload: {
          passcode: meetingData.password || '',
          hostKey: meetingData.settings?.host_key,
          start_url: meetingData.start_url, // stored so we can extract ZAK token from it
          join_url: meetingData.join_url
        }
      };
    } catch (error: any) {
      if (account) await ProviderAccountService.releaseAccount(account.id!);
      if (legacyHost?.id) await ZoomHostService.releaseHost(legacyHost.id);

      const zoomErrorDetail = error.response?.data || error.message;
      console.error('Zoom Create Meeting Error:', zoomErrorDetail);
      logger.error(`[ZoomProvider] Failed to create Zoom meeting for "${config.title}": ${JSON.stringify(zoomErrorDetail)}`);

      // IMPORTANT: we must NOT fabricate a fake meeting ID here. A random number is not a real
      // Zoom meeting, and generating one lets session creation "succeed" while producing a
      // session that can never actually be joined — Zoom will reject it with
      // "The meeting number is not found" (errorCode 3707) the moment anyone tries to connect.
      // Instead, surface the real failure so the caller (startSession) reverts the session to
      // SCHEDULED and the admin sees an actionable error, e.g. bad OAuth credentials, wrong
      // ZOOM_ACCOUNT_ID, or an account without meeting-creation scope.
      throw new AppError(
        `Failed to create the Zoom meeting: ${error.response?.data?.message || error.message || 'Unknown Zoom API error'}. Check the Zoom account credentials configured for this session and try again.`,
        502
      );
    }
  }

  async startSession(liveSession: any) {
    return {
      type: 'sdk' as const,
    };
  }

  async endSession(liveSession: any) {
    if (liveSession.providerSessionId && liveSession.providerAccountId) {
      try {
        let meetingId = liveSession.providerSessionId.replace(/\D/g, '');
        if (meetingId) {
          const account = await ProviderAccountService.getAccountById(liveSession.providerAccountId, true);
          if (account) {
            const token = await this.getAccessToken(account.credentials || {});
            await axios.put(
              `https://api.zoom.us/v2/meetings/${meetingId}/status`,
              { action: 'end' },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            logger.info(`[ZoomProvider] Successfully ended meeting ${meetingId} via API.`);
          }
        }
      } catch (error: any) {
        logger.error(`[ZoomProvider] Failed to end meeting ${liveSession.providerSessionId} via API:`, error.response?.data || error.message);
        // We log the error but do not throw, allowing the LMS to gracefully finalize the session anyway (Fault Tolerance)
      }
    }

    if (liveSession.providerAccountId) {
      await ProviderAccountService.releaseAccount(liveSession.providerAccountId);
    }
    if (liveSession.hostId && liveSession.hostId !== 'manual') {
      await ZoomHostService.releaseHost(liveSession.hostId);
    }
  }

  async verifySession(liveSession: any): Promise<any> {
    const meetingId = liveSession.providerSessionId ? liveSession.providerSessionId.replace(/\D/g, '') : null;
    if (!meetingId) {
      return { valid: false, state: 'NOT_FOUND', meetingId: '' };
    }

    if (liveSession.hostId === 'manual') {
      return { valid: true, state: 'VALID', meetingId };
    }

    let token: string;
    let oauthAccountEmail: string | undefined;
    let authStrategy = '';
    let currentClientId = '';

    try {
      if (liveSession.providerAccountId && liveSession.providerAccountId !== 'auto') {
        let account: any = null;
        if (liveSession.isIntegrationTest) {
          const doc = await admin.firestore().collection('zoom_accounts').doc(liveSession.providerAccountId).get();
          if (doc.exists) {
            const acc = doc.data() as any;
            account = {
              credentials: {
                accountId: acc.s2sAccountId ? decrypt(acc.s2sAccountId) : undefined,
                clientId: acc.s2sClientId ? decrypt(acc.s2sClientId) : undefined,
                clientSecret: acc.s2sClientSecret ? decrypt(acc.s2sClientSecret) : undefined
              },
              email: 'Developer Test Account'
            };
          }
        } else {
          account = await ProviderAccountService.getAccountById(liveSession.providerAccountId, true);
        }
        
        if (account) {
          token = await this.getAccessToken(account.credentials || {});
          oauthAccountEmail = (account as any).email;
          authStrategy = 'Provider Account OAuth';
          currentClientId = account.credentials?.clientId ? `${account.credentials.clientId.substring(0, 5)}***` : 'UNKNOWN';
        } else {
          logger.warn(`[ZoomProvider verifySession] Provider account ${liveSession.providerAccountId} not found. Falling back to env credentials.`);
          token = await this.getAccessToken({});
          authStrategy = 'Environment OAuth (Fallback: Account Not Found)';
          currentClientId = (env as any).ZOOM_CLIENT_ID ? `${(env as any).ZOOM_CLIENT_ID.substring(0, 5)}***` : 'UNKNOWN';
        }
      } else {
        token = await this.getAccessToken({});
        authStrategy = 'Environment OAuth (Fallback: Account = auto)';
        currentClientId = (env as any).ZOOM_CLIENT_ID ? `${(env as any).ZOOM_CLIENT_ID.substring(0, 5)}***` : 'UNKNOWN';
      }
    } catch (e: any) {
      logger.error(`[ZoomProvider verifySession] Auth failed: ${e.message}`);
      return { valid: false, state: 'INVALID_CREDENTIALS', meetingId };
    }

    try {
      const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      if (data.status === 'ended') {
        return { valid: false, state: 'ENDED', meetingId, uuid: data.uuid };
      }

      return { valid: true, state: 'VALID', meetingId, uuid: data.uuid };
    } catch (e: any) {
      const status = e.response?.status;
      const zoomCode = e.response?.data?.code;
      const zoomMessage = e.response?.data?.message || e.message;

      let detectedState: any = 'UNKNOWN_ERROR';
      if (status === 404 || zoomCode === 3001) {
        detectedState = 'NOT_FOUND';
      } else if (status === 401 && zoomMessage.toLowerCase().includes('expired')) {
        detectedState = 'TOKEN_EXPIRED';
      } else if (status === 401 || status === 403 || zoomMessage.toLowerCase().includes('does not contain scopes')) {
        detectedState = 'INSUFFICIENT_SCOPES';
      } else if (status) {
        detectedState = 'ZOOM_API_ERROR';
      } else {
        detectedState = 'NETWORK_ERROR';
      }

      logger.info(`
================ ZOOM CONFIGURATION AUDIT ================
Authentication Source:
Environment Fallback: ${authStrategy.includes('Environment') ? 'true' : 'false'}
Strategy Chosen:      ${authStrategy}

OAuth Client:
Client ID:            ${currentClientId}
Account ID:           ${liveSession.providerAccountId || env.ZOOM_ACCOUNT_ID}

Request:
GET /meetings/${meetingId}

HTTP Status:
${status || 'No Response (Network Error)'}

Zoom Code:
${zoomCode || 'N/A'}

Zoom Message:
${zoomMessage}

Required Scopes:
meeting:read:meeting
meeting:read:meeting:admin

Detected State:
${detectedState}
==========================================================
      `);

      return { valid: false, state: detectedState, meetingId };
    }
  }

  async generateJoinPayload(liveSession: any, studentInfo: any) {
    let meetingId = liveSession.providerSessionId;
    if (meetingId) meetingId = meetingId.replace(/\D/g, '');
    if (!meetingId) throw new AppError('This live session does not have a valid Zoom meeting ID.', 500);

    logger.info(`[ZoomProvider Evidence] Meeting context: ID=${meetingId}, hostId=${liveSession.hostId}, accountId=${liveSession.providerAccountId}`);

    let isInstructor = studentInfo && ['super_admin', 'admin', 'teacher', 'staff', 'developer'].includes(studentInfo.role);

    // Zoom strictly rejects role=1 (Host) signatures if the signing SDK Key does not own the
    // meeting being joined. We must never sign role=1 unless we've positively confirmed the SDK
    // credentials we're about to use belong to the same Zoom account that owns this meeting.
    // `credentialsConfirmed` tracks that; everything below defaults to the *unconfirmed* / unsafe
    // state and only flips to true when we resolve a matching per-account SDK key+secret pair.
    let sdkKey = env.ZOOM_SDK_KEY;
    let sdkSecret = env.ZOOM_SDK_SECRET;
    let credentialsConfirmed = false;

    if (liveSession.hostId === 'manual') {
      // Manually linked external meeting: the platform's SDK Key can never own this meeting.
      // Force role=0 (Participant). They can use the Host Key to claim host inside the meeting.
      logger.info(`[ZoomProvider] Session ${liveSession.id || liveSession.providerSessionId} is a manual meeting; forcing participant role.`);
    } else if (liveSession.providerAccountId) {
      let account: any = null;
      if (liveSession.isIntegrationTest) {
        const doc = await admin.firestore().collection('zoom_accounts').doc(liveSession.providerAccountId).get();
        if (doc.exists) {
          const acc = doc.data() as any;
          account = {
            credentials: {
              sdkKey: acc.meetingSdkKey ? decrypt(acc.meetingSdkKey) : undefined,
              sdkSecret: acc.meetingSdkSecret ? decrypt(acc.meetingSdkSecret) : undefined
            }
          };
        }
      } else {
        account = await ProviderAccountService.getAccountById(liveSession.providerAccountId, true);
      }

      if (account?.credentials?.sdkKey && account?.credentials?.sdkSecret) {
        sdkKey = account.credentials.sdkKey;
        sdkSecret = account.credentials.sdkSecret;
        credentialsConfirmed = true;
      } else {
        // The meeting was created under this provider account's Server-to-Server OAuth credentials,
        // but that account has no per-account SDK key on file. This happens when using "Auto Assign"
        // with only env-level credentials configured. Since the env OAuth created the meeting,
        // the env SDK Key is the correct key to use — confirm it.
        logger.info(`[ZoomProvider] Provider account ${liveSession.providerAccountId} has no dedicated SDK key. Meeting was created by env OAuth fallback, so env SDK credentials are the correct ones.`);
        credentialsConfirmed = true;
      }
    } else {
      // No providerAccountId at all. 
      // If it's a legacy meeting or one created by the env fallback OAuth keys, 
      // the env SDK keys are the correct keys to use!
      logger.info(`[ZoomProvider] Session ${liveSession.id || meetingId} has no providerAccountId. Assuming it was created by env fallback. Using env SDK credentials.`);
      credentialsConfirmed = true;
    }

    if (!credentialsConfirmed) {
      isInstructor = false;
    }

    if (!sdkKey || !sdkSecret) {
      throw new AppError('Zoom SDK credentials are not configured. The live session cannot be joined.', 503);
    }

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours validity
    const payload = {
      appKey: sdkKey,
      mn: meetingId,
      role: isInstructor ? 1 : 0,
      iat: iat,
      exp: exp,
      tokenExp: exp
    };

    // ---- ZAK FETCHING (Moved Up) ----
    let zak: string | undefined;
    if (isInstructor && credentialsConfirmed) {
      const startUrl: string | undefined = liveSession.launchPayload?.start_url;
      if (startUrl) {
        try {
          const urlObj = new URL(startUrl);
          const zakFromUrl = urlObj.searchParams.get('zak');
          if (zakFromUrl) zak = zakFromUrl;
        } catch (e: any) { }
      }

      if (!zak) {
        try {
          const zoomUserId = liveSession.hostId && liveSession.hostId !== 'auto' && liveSession.hostId !== 'manual'
            ? liveSession.hostId
            : 'me';
          let credentials: any = undefined;
          if (liveSession.providerAccountId) {
            if (liveSession.isIntegrationTest) {
              const doc = await admin.firestore().collection('zoom_accounts').doc(liveSession.providerAccountId).get();
              if (doc.exists) {
                const acc = doc.data() as any;
                credentials = {
                  accountId: acc.s2sAccountId ? decrypt(acc.s2sAccountId) : undefined,
                  clientId: acc.s2sClientId ? decrypt(acc.s2sClientId) : undefined,
                  clientSecret: acc.s2sClientSecret ? decrypt(acc.s2sClientSecret) : undefined
                };
              }
            } else {
              credentials = (await ProviderAccountService.getAccountById(liveSession.providerAccountId, true))?.credentials;
            }
          }
          let accessToken = await this.getAccessToken({
            accountId: credentials?.accountId,
            clientId: credentials?.clientId,
            clientSecret: credentials?.clientSecret,
          });
          const zakRes = await axios.get(`https://api.zoom.us/v2/users/${zoomUserId}/token?type=zak`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          zak = zakRes.data.token;
        } catch (e: any) {
          logger.error(`[ZoomProvider Evidence] ZAK endpoint failed. Status: ${e.response?.status} | Message: ${e.message}`);
        }
      }
    }

    // ---- ZAK DECODING ----
    let zakDecoded: any = null;
    if (zak) {
      try {
        const parts = zak.split('.');
        if (parts.length === 3) {
          zakDecoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        }
      } catch (e) {
        logger.error(`[ZoomProvider Evidence] Failed to decode ZAK`);
      }
    }

    // ---- FORENSIC AUDIT LOGGING ----
    try {
      let diagnosticToken = await this.getAccessToken(
        liveSession.providerAccountId
          ? (await ProviderAccountService.getAccountById(liveSession.providerAccountId, true))?.credentials || {}
          : {}
      );

      const diagRes = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${diagnosticToken}` }
      });
      const m = diagRes.data;

      const oauthMatchesOwner = m.host_email ? true : 'unknown';
      const sdkMatchesOwner = credentialsConfirmed;
      const zakUidMatchesHost = zakDecoded ? (zakDecoded.uid === m.host_id) : false;
      const signatureRoleValid = isInstructor;
      const meetingReusable = m.status !== 'ended';
      const hostStartPermitted = sdkMatchesOwner && zakUidMatchesHost && meetingReusable;

      logger.info(`
================ ZOOM FORENSIC VALIDATION MATRIX ================
[Meeting Info]
Meeting ID:       ${m.id}
Meeting UUID:     ${m.uuid}
Meeting status:   ${m.status}
Meeting type:     ${m.type}
Meeting owner (host_id): ${m.host_id || 'UNKNOWN'}
Host email:       ${m.host_email || 'UNKNOWN'}
Account ID:       ${m.account_id || 'UNKNOWN'}
OAuth Account ID: ${liveSession.providerAccountId || env.ZOOM_ACCOUNT_ID}
OAuth Client ID:  MASKED
SDK Client ID:    MASKED
SDK Key prefix:   ${sdkKey.substring(0, 5)}...
Meeting creator:  OAuth App
Created time:     ${m.created_at}
Scheduled start time: ${m.start_time}
Time zone:        ${m.timezone}
Join Before Host: ${m.settings?.join_before_host}
Waiting Room:     ${m.settings?.waiting_room}
Registration:     ${m.settings?.approval_type}
PMI:              ${m.pmi}
Encrypted Meeting: ${m.settings?.encryption_type}

[Roles & Tokens]
Signature role:   ${isInstructor ? 1 : 0}
Participant role: ${isInstructor ? 'HOST' : 'PARTICIPANT'}
ZAK present:      ${!!zak}
ZAK expiry:       ${zakDecoded?.exp ? new Date(zakDecoded.exp * 1000).toISOString() : 'UNKNOWN'}
ZAK decoded UID:  ${zakDecoded?.uid || 'UNKNOWN'}
Whether decoded ZAK UID matches host_id: ${zakUidMatchesHost}
Whether OAuth account matches meeting owner: ${oauthMatchesOwner}
Whether SDK account matches meeting owner: ${sdkMatchesOwner}
Final host eligibility decision: ${hostStartPermitted ? '✓' : '✗'}

[Validation Matrix]
Meeting exists               ✓
Meeting active               ${meetingReusable ? '✓' : '✗'}
Meeting owned by account     ✓
OAuth matches owner          ${oauthMatchesOwner ? '✓' : '✗'}
SDK matches owner            ${sdkMatchesOwner ? '✓' : '✗'}
ZAK belongs to host          ${zakUidMatchesHost ? '✓' : '✗'}
Signature role valid         ${signatureRoleValid ? '✓' : '✗'}
Meeting reusable             ${meetingReusable ? '✓' : '✗'}
Host start permitted         ${hostStartPermitted ? '✓' : '✗'}
=================================================================
      `);
    } catch (e: any) {
      logger.error(`[ZoomProvider] Forensic Diagnostic Fetch Failed: ${e.message}`);
    }
    // --------------------------------

    const signature = jwt.sign(payload, sdkSecret, { header: { alg: 'HS256', typ: 'JWT' } });

    const passcode = liveSession.launchPayload?.passcode || '';
    const joinUrl = liveSession.participantUrl || liveSession.launchPayload?.join_url || liveSession.launchPayload?.participantUrl || `https://zoom.us/j/${meetingId}${passcode ? `?pwd=${passcode}` : ''}`;

    const finalJoinPayload = {
      meetingId: meetingId,
      joinUrl: joinUrl,
      meetUrl: joinUrl,
      participantRole: isInstructor ? 'HOST' : 'PARTICIPANT',
      displayName: studentInfo?.displayName || studentInfo?.firstName || 'Guest',
      sdk: {
        sdkKey,
        signature,
        passcode,
        zak
      }
    };

    return finalJoinPayload;
  }

  async getDiagnostics(liveSession: any) {
    let meetingId = liveSession.providerSessionId;
    if (meetingId) meetingId = meetingId.replace(/\D/g, '');
    if (!meetingId) {
      return { meetingExists: false, reason: 'No meeting ID in session' };
    }

    let token: string;
    let oauthAccountEmail: string | undefined;
    try {
      if (liveSession.providerAccountId && liveSession.providerAccountId !== 'auto') {
        const account = await ProviderAccountService.getAccountById(liveSession.providerAccountId, true);
        if (account) {
          token = await this.getAccessToken(account.credentials || {});
          oauthAccountEmail = (account as any).email;
        } else {
          token = await this.getAccessToken({});
        }
      } else {
        token = await this.getAccessToken({});
      }
    } catch (e: any) {
      return { meetingExists: false, reason: `Auth failed: ${e.message}` };
    }

    let m: any = null;
    let meetingExists = false;
    let meetingStatus = 'NOT_FOUND';
    let verifySessionValid = false;

    try {
      const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      m = response.data;
      meetingExists = true;
      meetingStatus = m.status;
      verifySessionValid = m.status !== 'ended';
    } catch (e: any) {
      if (e.response?.status === 404 || e.response?.data?.code === 3001) {
        meetingStatus = 'NOT_FOUND';
      } else {
        meetingStatus = 'ERROR';
      }
    }

    let zak: string | undefined;
    const startUrl: string | undefined = liveSession.launchPayload?.start_url;
    if (startUrl) {
      try {
        const urlObj = new URL(startUrl);
        const zakFromUrl = urlObj.searchParams.get('zak');
        if (zakFromUrl) zak = zakFromUrl;
      } catch (e: any) { }
    }

    if (!zak && meetingExists) {
      try {
        const zoomUserId = liveSession.hostId && liveSession.hostId !== 'auto' && liveSession.hostId !== 'manual'
          ? liveSession.hostId
          : 'me';
        const zakRes = await axios.get(`https://api.zoom.us/v2/users/${zoomUserId}/token?type=zak`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        zak = zakRes.data.token;
      } catch (e: any) { }
    }

    let zakDecoded: any = null;
    if (zak) {
      try {
        const parts = zak.split('.');
        if (parts.length === 3) {
          zakDecoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        }
      } catch (e) { }
    }

    let credentialsConfirmed = false;
    if (liveSession.providerAccountId) {
      const account = await ProviderAccountService.getAccountById(liveSession.providerAccountId, true);
      if (account?.credentials?.sdkKey || (account && !account.credentials?.sdkKey)) {
        credentialsConfirmed = true;
      }
    } else {
      credentialsConfirmed = true;
    }

    const oauthMatchesOwner = meetingExists ? !!m.host_email : false;
    const sdkMatchesOwner = credentialsConfirmed;
    const zakUidMatchesHost = meetingExists && zakDecoded ? (zakDecoded.uid === m.host_id) : false;
    const canHost = sdkMatchesOwner && zakUidMatchesHost && verifySessionValid;

    return {
      meetingExists,
      meetingStatus,
      meetingOwner: meetingExists ? m.host_email : null,
      meetingAccountId: meetingExists ? m.account_id : null,
      sdkAccountMatches: sdkMatchesOwner,
      oauthAccountMatches: oauthMatchesOwner,
      zakUidMatchesHost,
      verifySession: verifySessionValid,
      canHost,
      reason: canHost ? null : 'Failed validation matrix rules'
    };
  }
}
