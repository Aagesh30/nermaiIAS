import { Request, Response } from "express";
import admin from "firebase-admin";
import axios from "axios";
import crypto from "crypto";
import { encrypt, decrypt } from "./encryption";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const ZOOM_ACCOUNTS_COLLECTION = 'zoom_accounts';

// Mask helper
function maskSecret(secret: string | undefined): string {
    if (!secret) return '';
    if (secret.length <= 4) return '****';
    return `****${secret.slice(-4)}`;
}

function maskObj(obj: any): any {
    return {
        ...obj,
        meetingSdkKey: maskSecret(obj.meetingSdkKey),
        meetingSdkSecret: maskSecret(obj.meetingSdkSecret),
        s2sAccountId: maskSecret(obj.s2sAccountId),
        s2sClientId: maskSecret(obj.s2sClientId),
        s2sClientSecret: maskSecret(obj.s2sClientSecret),
    };
}

export class ZoomAccountsController {
    
    // GET /api/zoom-accounts
    static async getAccounts(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(ZOOM_ACCOUNTS_COLLECTION).get();
            const accounts = snapshot.docs.map(doc => {
                const data = doc.data();
                // Never return raw decrypted secrets. Mask the encrypted string as well to just indicate presence.
                // Wait, if we return masked secrets, we should use a placeholder so the frontend knows it's populated.
                return {
                    id: doc.id,
                    name: data.name || 'Unnamed Account',
                    status: data.status || 'invalid',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
                    // Just return masked indicators
                    meetingSdkKey: data.meetingSdkKey ? '********' : '',
                    meetingSdkSecret: data.meetingSdkSecret ? '********' : '',
                    s2sAccountId: data.s2sAccountId ? '********' : '',
                    s2sClientId: data.s2sClientId ? '********' : '',
                    s2sClientSecret: data.s2sClientSecret ? '********' : ''
                };
            });
            
            return res.status(200).json({ success: true, data: accounts });
        } catch (error: any) {
            console.error('Error getting zoom accounts:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve accounts' });
        }
    }

    // POST /api/zoom-accounts
    static async createAccount(req: Request, res: Response) {
        try {
            const { name, meetingSdkKey, meetingSdkSecret, s2sAccountId, s2sClientId, s2sClientSecret } = req.body;
            
            const newAccount = {
                name: (name || 'New Zoom Account').trim(),
                status: 'invalid', // Default to invalid until tested
                meetingSdkKey: meetingSdkKey ? encrypt(meetingSdkKey.trim()) : '',
                meetingSdkSecret: meetingSdkSecret ? encrypt(meetingSdkSecret.trim()) : '',
                s2sAccountId: s2sAccountId ? encrypt(s2sAccountId.trim()) : '',
                s2sClientId: s2sClientId ? encrypt(s2sClientId.trim()) : '',
                s2sClientSecret: s2sClientSecret ? encrypt(s2sClientSecret.trim()) : '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            const docRef = await db.collection(ZOOM_ACCOUNTS_COLLECTION).add(newAccount);
            
            return res.status(201).json({ success: true, message: 'Account created', data: { id: docRef.id } });
        } catch (error: any) {
            console.error('Error creating zoom account:', error);
            return res.status(500).json({ success: false, message: 'Failed to create account' });
        }
    }

    // PUT /api/zoom-accounts/:id
    static async updateAccount(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, meetingSdkKey, meetingSdkSecret, s2sAccountId, s2sClientId, s2sClientSecret } = req.body;
            
            const updates: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            if (name !== undefined) updates.name = name.trim();
            // Only update credentials if a new value was provided and it's not the mask string
            if (meetingSdkKey && meetingSdkKey !== '********') updates.meetingSdkKey = encrypt(meetingSdkKey.trim());
            if (meetingSdkSecret && meetingSdkSecret !== '********') updates.meetingSdkSecret = encrypt(meetingSdkSecret.trim());
            if (s2sAccountId && s2sAccountId !== '********') updates.s2sAccountId = encrypt(s2sAccountId.trim());
            if (s2sClientId && s2sClientId !== '********') updates.s2sClientId = encrypt(s2sClientId.trim());
            if (s2sClientSecret && s2sClientSecret !== '********') updates.s2sClientSecret = encrypt(s2sClientSecret.trim());
            
            // If credentials changed, it should probably be re-tested
            if (updates.meetingSdkKey || updates.meetingSdkSecret || updates.s2sAccountId || updates.s2sClientId || updates.s2sClientSecret) {
                updates.status = 'invalid';
            }

            await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).update(updates);
            
            return res.status(200).json({ success: true, message: 'Account updated' });
        } catch (error: any) {
            console.error('Error updating zoom account:', error);
            return res.status(500).json({ success: false, message: 'Failed to update account' });
        }
    }

    // DELETE /api/zoom-accounts/:id
    static async deleteAccount(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).delete();
            return res.status(200).json({ success: true, message: 'Account deleted' });
        } catch (error: any) {
            console.error('Error deleting zoom account:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete account' });
        }
    }

    // POST /api/zoom-accounts/:id/test
    static async testAccount(req: Request, res: Response) {
        let createdMeetingId: string | null = null;
        let s2sAccessToken: string | null = null;
        let meetingPayload: any = null;

        try {
            const { id } = req.params;
            const doc = await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).get();
            
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: 'Account not found' });
            }
            
            const data = doc.data() as any;
            
            if (!data.s2sAccountId || !data.s2sClientId || !data.s2sClientSecret || !data.meetingSdkKey || !data.meetingSdkSecret) {
                return res.status(400).json({ success: false, message: 'Account is missing required credentials' });
            }

            // 1. Decrypt credentials securely (in memory only, never logged)
            const accountId = decrypt(data.s2sAccountId).trim();
            const clientId = decrypt(data.s2sClientId).trim();
            const clientSecret = decrypt(data.s2sClientSecret).trim();
            const sdkKey = decrypt(data.meetingSdkKey).trim();
            const sdkSecret = decrypt(data.meetingSdkSecret).trim();

            // 2. Obtain S2S OAuth Token
            const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
            const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
            
            try {
                const tokenResponse = await axios.post(tokenUrl, {}, {
                    headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                s2sAccessToken = tokenResponse.data.access_token;
            } catch (authErr: any) {
                await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).update({ status: 'invalid' });
                return res.status(400).json({ 
                    success: false, 
                    message: 'S2S OAuth authentication failed. Please check Account ID, Client ID, and Client Secret.',
                    details: authErr.response?.data || authErr.message
                });
            }

            // 3. Create temporary meeting to test API scopes and Meeting SDK functionality
            try {
                const meetingResponse = await axios.post('https://api.zoom.us/v2/users/me/meetings', {
                    topic: 'NERMAI Developer Portal - Integration Test',
                    type: 1, // Instant meeting
                    settings: { host_video: false, participant_video: false }
                }, {
                    headers: { 'Authorization': `Bearer ${s2sAccessToken}`, 'Content-Type': 'application/json' }
                });
                createdMeetingId = meetingResponse.data.id;
                meetingPayload = meetingResponse.data;
            } catch (meetingErr: any) {
                await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).update({ status: 'invalid' });
                return res.status(400).json({ 
                    success: false, 
                    message: 'Failed to create a Zoom meeting. Ensure S2S OAuth scopes include meeting:write:admin.',
                    details: meetingErr.response?.data || meetingErr.message
                });
            }

            // 4. Test Meeting SDK Signature Generation
            try {
                const iat = Math.round(new Date().getTime() / 1000) - 30;
                const exp = iat + 60 * 60 * 2;
                const oHeader = { alg: 'HS256', typ: 'JWT' };
                const oPayload = {
                  sdkKey: sdkKey,
                  appKey: sdkKey,
                  mn: createdMeetingId,
                  role: 1,
                  iat: iat,
                  exp: exp,
                  tokenExp: exp
                };
                
                const sHeader = Buffer.from(JSON.stringify(oHeader)).toString('base64url');
                const sPayload = Buffer.from(JSON.stringify(oPayload)).toString('base64url');
                const signature = crypto.createHmac('sha256', sdkSecret).update(`${sHeader}.${sPayload}`).digest('base64url');
                const finalSignature = `${sHeader}.${sPayload}.${signature}`;
                
                if (!finalSignature) throw new Error('Signature generation yielded empty result');
            } catch (sigErr: any) {
                await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).update({ status: 'invalid' });
                return res.status(400).json({ 
                    success: false, 
                    message: 'Meeting SDK signature generation failed. Check SDK Key and Secret.',
                    details: sigErr.message
                });
            }

            // 5. Instead of cleaning up, create an Integration Test Class in Firestore
            let classId = `zoom-test-${createdMeetingId}`;
            let sessionId = `zoom-test-${createdMeetingId}`;

            try {
                const now = admin.firestore.FieldValue.serverTimestamp();
                
                // Ensure a test class document exists
                await db.collection('classes').doc(classId).set({
                    title: `Integration Test Class - ${id.substring(0,6)}`,
                    classType: 'zoom_live',
                    provider: 'zoom',
                    status: 'live',
                    meetingId: String(createdMeetingId),
                    zoomAccountId: id,
                    teacherId: 'developer',
                    tenantId: 'default_tenant',
                    isIntegrationTest: true, // Marker to isolate from normal analytics
                    createdAt: now,
                    expectedDurationMinutes: 60
                });

                // Ensure an active live session document exists
                await db.collection('live_sessions').doc(sessionId).set({
                    classId: classId,
                    meetingId: String(createdMeetingId),
                    providerSessionId: String(createdMeetingId),
                    provider: 'zoom',
                    status: 'active',
                    hostId: 'developer',
                    providerAccountId: id,
                    zoomAccountId: id,
                    isIntegrationTest: true,
                    launchPayload: {
                        passcode: meetingPayload?.password || '',
                        start_url: meetingPayload?.start_url || '',
                        join_url: meetingPayload?.join_url || ''
                    },
                    createdAt: now
                });
            } catch (fsErr: any) {
                console.error("Failed to create test class documents:", fsErr);
                // Attempt cleanup of zoom meeting since we failed to save it
                try {
                    await axios.delete(`https://api.zoom.us/v2/meetings/${createdMeetingId}`, {
                        headers: { 'Authorization': `Bearer ${s2sAccessToken}` }
                    });
                } catch(e) {}
                
                return res.status(500).json({
                    success: false,
                    message: "Failed to provision Integration Test class in database.",
                    details: fsErr.message
                });
            }

            // End-to-end success!
            await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).update({ 
                status: 'valid',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Integration test class successfully provisioned.',
                data: {
                    classId: classId,
                    sessionId: sessionId,
                    meetingId: createdMeetingId
                }
            });
        } catch (error: any) {
            console.error('Error testing zoom account:', error);
            return res.status(500).json({ success: false, message: 'Failed to test account' });
        }
    }

    // POST /api/zoom-accounts/:id/test-cleanup
    static async testCleanup(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { meetingId, classId, sessionId } = req.body;

            if (!meetingId || !classId || !sessionId) {
                return res.status(400).json({ success: false, message: 'Missing required cleanup parameters (meetingId, classId, sessionId).' });
            }

            // 1. Fetch credentials to get S2S token for zoom deletion
            const doc = await db.collection(ZOOM_ACCOUNTS_COLLECTION).doc(id).get();
            if (doc.exists) {
                const data = doc.data() as any;
                if (data.s2sAccountId && data.s2sClientId && data.s2sClientSecret) {
                    try {
                        const accountId = decrypt(data.s2sAccountId);
                        const clientId = decrypt(data.s2sClientId);
                        const clientSecret = decrypt(data.s2sClientSecret);
                        
                        const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
                        const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
                        const tokenResponse = await axios.post(tokenUrl, {}, {
                            headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }
                        });
                        const s2sAccessToken = tokenResponse.data.access_token;

                        // Delete the Zoom meeting
                        await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                            headers: { 'Authorization': `Bearer ${s2sAccessToken}` }
                        });
                    } catch (cleanupErr) {
                        console.warn(`Could not delete zoom meeting ${meetingId} during cleanup. It may have already expired.`, cleanupErr);
                    }
                }
            }

            // 2. Delete the Firestore documents to prevent clutter
            await db.collection('live_sessions').doc(sessionId).delete();
            await db.collection('classes').doc(classId).delete();

            return res.status(200).json({ success: true, message: 'Test class cleaned up successfully.' });
        } catch (error: any) {
            console.error('Error cleaning up zoom test account:', error);
            return res.status(500).json({ success: false, message: 'Failed to cleanup test class.' });
        }
    }
}
