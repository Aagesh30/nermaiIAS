import { Request, Response } from 'express';
import { redisClient } from '../../infrastructure/redis';
import { logger } from '../../core/logger';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { attendanceService } from '../attendance/service';

function esc(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildExpiredPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><title>Session Expired — Nermai IAS</title>
  <style>
    body{margin:0;background:#0F172A;color:#fff;font-family:'Segoe UI',Arial,sans-serif;
         display:flex;align-items:center;justify-content:center;height:100vh;}
    .box{text-align:center;padding:40px 32px;background:#1E293B;border-radius:16px;
         border:1px solid rgba(255,255,255,.08);max-width:380px;}
    h1{color:#EF4444;font-size:22px;margin-bottom:12px;}
    p{color:#94A3B8;font-size:14px;line-height:1.6;}
    button{margin-top:24px;background:#667EEA;color:#fff;border:none;padding:10px 28px;
           border-radius:8px;cursor:pointer;font-size:15px;font-weight:600;}
    button:hover{background:#5A6FD6;}
  </style>
</head>
<body>
  <div class="box">
    <h1>&#9203; Session Expired</h1>
    <p>Your video access session has expired.<br/>Go back and reload the video to start a new session.</p>
    <button onclick="window.history.back()">Go Back</button>
  </div>
</body>
</html>`;
}

function buildPlayerPage({ videoId, classId, playerJwt, videoTitle, studentName, studentEmail, isLive, resumePosition = 0 }: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(videoTitle)} — Nermai IAS</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      width: 100vw; height: 100vh;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      cursor: default;
    }
    #player-container {
      width: 100%; height: 100%;
      position: absolute; top: 0; left: 0; z-index: 1;
    }
    #frame {
      width: 100%; height: 100%;
      border: none; display: block;
    }
    #watermark {
      position: absolute; bottom: 0; left: 0; z-index: 9999; width: 100px; height: 55px;
      padding: 4px 8px; border-radius: 0 8px 0 0; background: rgba(15, 23, 42, 1);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1);
      display: flex; flex-direction: column; justify-content: center; pointer-events: auto;
    }
    #watermark p { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.3; text-shadow: 1px 1px 3px rgba(0,0,0,0.9); white-space: nowrap; margin: 0; overflow: hidden; text-overflow: ellipsis; }
    .wm-name  { font-size: 10px; font-weight: 700; color: #FFD54F; letter-spacing: .2px; }
    .wm-email { font-size: 8px; color: #b0bec5; }
    .wm-time  { font-size: 8px; color: #eceff1; margin-top: 1px; }
    #fs-btn {
      position: absolute; bottom: 16px; right: 16px; z-index: 10000; background: rgba(0,0,0,0.6);
      color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; width: 44px; height: 44px;
      font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;
    }
    #fs-btn:hover { background: rgba(0,0,0,0.9); }
    ${isLive ? `
    #live-badge {
      position: fixed; top: 14px; left: 14px; background: #E53935; color: #fff; padding: 3px 12px; border-radius: 4px;
      font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1.2px; z-index: 10000;
      animation: pulse 1.8s ease-in-out infinite; pointer-events: none;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.65} }
    ` : ''}
    ${env.NODE_ENV !== 'production' ? `
    #debug-fab {
      position: absolute; bottom: 80px; right: 16px; width: 40px; height: 40px;
      background: #E53935; border-radius: 20px; z-index: 99998;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.2);
    }
    #debug-fab span { font-size: 18px; line-height: 1; }
    #debug-sheet {
      position: absolute; bottom: 0; left: 0; width: 100%;
      background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px);
      color: #0f0; font-family: monospace; font-size: 12px; padding: 16px;
      border-top: 1px solid #444; z-index: 99999; transform: translateY(100%);
      transition: transform 0.3s ease-out; pointer-events: none;
    }
    #debug-sheet.open { transform: translateY(0); pointer-events: auto; }
    #debug-sheet-close { position: absolute; top: 8px; right: 12px; color: #fff; cursor: pointer; font-size: 16px; font-weight: bold; }
    #debug-sheet h3 { color: #fff; margin-bottom: 8px; font-size: 14px; border-bottom: 1px solid #444; padding-bottom: 4px; }
    #debug-sheet .row { display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px dotted rgba(255,255,255,0.1); padding-bottom: 2px;}
    #debug-sheet span { color: #fff; }
    #debug-btn { margin-top: 12px; background: #667EEA; color: #fff; border: none; padding: 8px; width: 100%; cursor: pointer; border-radius: 4px; font-weight: bold; }
    ` : ''}
    .block-top-left { position: absolute; top: 0; left: 0; width: 70%; height: 80px; z-index: 100; background: transparent; }
    .block-top-right { position: absolute; top: 0; right: 0; width: 30%; height: 80px; z-index: 100; background: transparent; }
    .block-bottom-right { position: absolute; bottom: 0; right: 0; width: 180px; height: 80px; z-index: 100; background: transparent; pointer-events: none;}
  </style>
</head>
<body>
  <div class="block-top-left"></div>
  <div class="block-top-right"></div>
  <div class="block-bottom-right"></div>

  <button id="fs-btn" title="Toggle Fullscreen">⛶</button>

  <div id="player-container">
    <div id="frame"></div>
  </div>

  <div id="watermark">
    <p class="wm-name">${esc(studentName)}</p>
    <p class="wm-email">${esc(studentEmail)}</p>
    <p class="wm-time" id="wm-time"></p>
  </div>
  ${isLive ? '<div id="live-badge">&#128308; LIVE</div>' : ''}
  ${/* env.NODE_ENV !== 'production' */ false ? `
  <div id="debug-fab" title="Attendance Diagnostics"><span>🐞</span></div>
  <div id="debug-sheet">
    <div id="debug-sheet-close">&times;</div>
    <h3>Attendance Diagnostics</h3>
    <div class="row">Class ID <span><span id="dbg-class"></span></span></div>
    <div class="row">Provider <span><span id="dbg-provider"></span></span></div>
    <div class="row">Status <span><span id="dbg-status"></span></span></div>
    <div class="row">Interval <span><span id="dbg-interval"></span> ms</span></div>
    <div class="row" style="margin-top:8px;">Last Event <span><span id="dbg-event">None</span></span></div>
    <div class="row">Last Response <span><span id="dbg-res">None</span></span></div>
    <button id="debug-btn">Send Test Event</button>
  </div>
  ` : ''}

<script src="https://www.youtube.com/iframe_api"></script>
<script>
  console.log('[Player] Secure iframe script loaded. isLive:', ${isLive});
  const CONFIG = {
    videoId: "${esc(videoId)}",
    classId: "${esc(classId)}",
    jwt: "${esc(playerJwt)}",
    isLive: ${isLive},
    isDev: ${env.NODE_ENV !== 'production'},
    apiUrl: window.location.origin,
    watchProgressInterval: ${env.NODE_ENV !== 'production' ? 300000 : env.WATCH_PROGRESS_INTERVAL * 1000},
    attendanceHeartbeatInterval: ${env.NODE_ENV !== 'production' ? 300000 : env.ATTENDANCE_HEARTBEAT_INTERVAL * 1000},
    completionPercent: ${env.VIDEO_COMPLETION_PERCENT},
    resumePosition: ${resumePosition}
  };

  let player;
  let lastSavedTime = 0;
  let activeTimeInterval = null;
  let isCompleted = false;
  
  function updateDebug(key, val) {
    if (CONFIG.isDev) {
      const el = document.getElementById('dbg-' + key);
      if (el) el.textContent = val;
    }
  }

  function onYouTubeIframeAPIReady() {
    console.log('[Attendance] Player Loaded');
    player = new YT.Player('frame', {
      height: '100%',
      width: '100%',
      videoId: CONFIG.videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        color: 'white',
        enablejsapi: 1,
        fs: 0,
        origin: window.location.origin
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  }

  function onPlayerReady(event) {
    if (CONFIG.isDev) {
      updateDebug('class', CONFIG.classId);
      updateDebug('provider', CONFIG.isLive ? 'youtube_live' : 'youtube_recorded');
      updateDebug('status', CONFIG.isLive ? 'LIVE' : 'RECORDED');
      updateDebug('interval', CONFIG.isLive ? CONFIG.attendanceHeartbeatInterval : CONFIG.watchProgressInterval);
      const btn = document.getElementById('debug-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          console.log('[Attendance] Manual Test Event Triggered');
          if (CONFIG.isLive) sendHeartbeat(false, 'HEARTBEAT');
          else saveProgress(false, 'PLAY');
        });
      }
      const fab = document.getElementById('debug-fab');
      const sheet = document.getElementById('debug-sheet');
      const closeSheet = document.getElementById('debug-sheet-close');
      if (fab && sheet && closeSheet) {
        fab.addEventListener('click', () => sheet.classList.add('open'));
        closeSheet.addEventListener('click', () => sheet.classList.remove('open'));
      }
    }

    if (!CONFIG.isLive) {
      console.log('[Player] Recorded video mode: Attendance API calls disabled.');
      if (CONFIG.resumePosition > 0 && player && player.seekTo) {
        player.seekTo(CONFIG.resumePosition, true);
        console.log('[Player] Resumed playback at ' + CONFIG.resumePosition + 's');
      }
    } else {
      sendHeartbeat(false, 'JOIN');
      startHeartbeat();
    }
  }

  function onPlayerStateChange(event) {
    if (CONFIG.isLive) return;
  }

  function saveProgress(forceFlush = false, customEvent = 'PLAY') {
    // Recorded YouTube classes do not send attendance events
    return;
  }

  // --- Live Heartbeat Logic ---
  let isUserActive = true;
  let inactivityTimer = null;

  function resetActivity() {
    isUserActive = true;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      isUserActive = false;
    }, 5 * 60 * 1000);
  }

  document.addEventListener('mousemove', resetActivity);
  document.addEventListener('keydown', resetActivity);
  document.addEventListener('touchstart', resetActivity);
  window.addEventListener('focus', resetActivity);
  
  function startHeartbeat() {
    console.log('[Attendance] HEARTBEAT Started (Live)');
    resetActivity();
    setInterval(sendHeartbeat, CONFIG.attendanceHeartbeatInterval);
  }

  function sendHeartbeat(forceFlush = false, customEvent = 'HEARTBEAT') {
    try {
      if (document.visibilityState === 'hidden') isUserActive = false;
      
      const reqId = 'att-' + Math.random().toString(36).substring(2, 10);
      const ev = isUserActive ? customEvent : 'BACKGROUND';
      const payload = JSON.stringify({
        classId: CONFIG.classId,
        event: ev,
        position: player && player.getCurrentTime ? Math.floor(player.getCurrentTime()) : 0,
        timestamp: new Date().toISOString(),
        provider: 'youtube_live',
        requestId: reqId
      });

      console.log(\`[Attendance] [\${reqId}] \${ev === 'JOIN' ? 'JOIN Sent' : 'HEARTBEAT Fired'} (Live)\`);
      console.log(\`[Attendance] [\${reqId}] Sending\`, payload);
      updateDebug('event', ev);

      if (forceFlush && navigator.sendBeacon) {
        console.log(\`[Attendance] [\${reqId}] sendBeacon heartbeat:\`, payload);
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(\`\${CONFIG.apiUrl}/api/v1/attendance/event?token=\${CONFIG.jwt}\`, blob);
      } else {
        fetch(\`\${CONFIG.apiUrl}/api/v1/attendance/event\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${CONFIG.jwt}\`
          },
          body: payload
        }).then(res => {
          console.log(\`[Attendance] [\${reqId}] Response \${res.status} \${res.statusText}\`);
          updateDebug('res', res.status + ' OK');
          console.log(\`[Attendance] [\${reqId}] Next Interval Scheduled\`);
        }).catch(err => {
          console.error(\`[Attendance] [\${reqId}] Fetch Error:\`, err);
          updateDebug('res', 'Error');
        });
      }
    } catch (error) {
      console.error('[Player] sendHeartbeat error:', error);
    }
  }

  // Immediate sync on hidden tab
  document.addEventListener("visibilitychange", () => {
    if (CONFIG.isLive) {
      if (document.visibilityState === 'hidden') sendHeartbeat(false, 'BACKGROUND');
      else sendHeartbeat(false, 'FOREGROUND');
    }
  });

  // Handle Unload (Flush)
  window.addEventListener('beforeunload', () => {
    if (CONFIG.isLive) {
      console.log('[Attendance] Live Component Unmounted');
      sendHeartbeat(true, 'LEAVE');
    }
  });

  /* ── Fullscreen Logic ── */
  const fsBtn = document.getElementById('fs-btn');
  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  });

  /* ── Anti-inspection deterrents ── */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart',   e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    const blocked = e.key === 'F12' || e.key === 'PrintScreen' ||
      (e.ctrlKey && e.shiftKey && ['I','J','C','K','E'].includes(e.key.toUpperCase())) ||
      (e.ctrlKey && ['U','S','A','P','H'].includes(e.key.toUpperCase())) ||
      (e.metaKey && e.altKey && e.key.toUpperCase() === 'I');
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
  });

  /* ── Static watermark time update ── */
  function updateTime() {
    document.getElementById('wm-time').textContent = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  }
  updateTime();
  setInterval(updateTime, 1000);
</script>
</body>
</html>`;
}

export const renderPlayer = async (req: Request, res: Response) => {
  try {
    console.log(`[Player] Initializing render for token: ${req.params.token}`);
    const token = req.params.token;
    if (!token) return res.status(400).send('Missing player token');

    const cacheKey = `player:${token}`;
    const tokenDataStr = await redisClient.get(cacheKey);

    if (!tokenDataStr) return res.status(410).send(buildExpiredPage());

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenDataStr);
    } catch {
      return res.status(400).send('Invalid token payload');
    }

    const { videoId, classId, userId, videoTitle, videoType, studentName, studentEmail } = tokenData;
    if (!videoId || !classId || !userId) return res.status(400).send('Incomplete token payload');

    // ── Soft-use token lifecycle ──────────────────────────────────────────────
    // Instead of deleting on first use (which causes 410 on React StrictMode
    // double-mount, HMR, and transient network retries), we mark the token as
    // used and allow re-use within the remaining TTL window.
    //
    // Security: the token is still user-scoped (userId embedded) and expires
    // automatically. In production, additionally bind to IP or session if needed.
    if (!tokenData.used) {
      tokenData.used = true;
      tokenData.firstUsedAt = new Date().toISOString();
      // Preserve the remaining TTL — keep existing expiry, just update payload
      const remaining = await redisClient.call('TTL', cacheKey) as number;
      const ttlToKeep = remaining > 0 ? remaining : 300;
      await redisClient.set(cacheKey, JSON.stringify(tokenData), 'EX', ttlToKeep);
      logger.debug(`[Player] Token ${token} first use by user ${userId}`);
    } else {
      logger.debug(`[Player] Token ${token} re-used by user ${userId} (StrictMode/HMR/retry)`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const isLive = videoType === 'youtube_live';

    // Generate player JWT for accessing backend APIs seamlessly
    const playerJwt = jwt.sign({ userId, classId }, env.JWT_SECRET || 'fallback_secret', { expiresIn: '4h' });

    // Per-route CSP: allow framing from Expo dev server (any localhost port) and
    // from production Nermai domains. X-Frame-Options is removed because it only
    // allows a single value and can't express multiple origins.
    res.removeHeader('X-Frame-Options');
    const isDev = env.NODE_ENV !== 'production';
    const allowedAncestors = isDev
      ? `'self' http://localhost:* http://127.0.0.1:* https://*.nermai.com`
      : `'self' https://*.nermai.com`;
    res.setHeader('Content-Security-Policy', `frame-ancestors ${allowedAncestors}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let resumePosition = 0;
    if (!isLive) {
      const state = await attendanceService.getPlaybackState(userId, classId);
      resumePosition = state.watchTimeSeconds;
    }

    res.send(buildPlayerPage({ videoId, classId, playerJwt, videoTitle, studentName, studentEmail, isLive, resumePosition }));
  } catch (error) {
    logger.error('Error rendering secure player:', error);
    res.status(500).send('Internal Server Error');
  }
};

function buildZoomPlayerPage({ meetingNumber, signature, sdkKey, userName, playerJwt, classId, isLive, passcode }: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zoom Live Class</title>
    <!-- For Zoom Web SDK -->
    <link type="text/css" rel="stylesheet" href="https://source.zoom.us/3.1.6/css/bootstrap.css" />
    <link type="text/css" rel="stylesheet" href="https://source.zoom.us/3.1.6/css/react-select.css" />
    <style>
      body { margin: 0; padding: 0; background: black; overflow: hidden; }
      #zmmtg-root { width: 100%; height: 100%; position: absolute; }
      #watermark {
        position: absolute; bottom: 0; left: 0; z-index: 9999; width: 100px; height: 55px;
        padding: 4px 8px; border-radius: 0 8px 0 0; background: rgba(15, 23, 42, 1);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border-top: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1);
        display: flex; flex-direction: column; justify-content: center; pointer-events: none;
      }
      #watermark p { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.3; text-shadow: 1px 1px 3px rgba(0,0,0,0.9); white-space: nowrap; margin: 0; overflow: hidden; text-overflow: ellipsis; }
      .wm-name  { font-size: 10px; font-weight: 700; color: #FFD54F; letter-spacing: .2px; }
      .wm-time  { font-size: 8px; color: #eceff1; margin-top: 1px; }
    </style>
</head>
<body>
    <div id="zmmtg-root"></div>
    <div id="watermark">
      <p class="wm-name">${esc(userName)}</p>
      <p class="wm-time" id="wm-time"></p>
    </div>
    <script src="https://source.zoom.us/3.1.6/lib/vendor/react.min.js"></script>
    <script src="https://source.zoom.us/3.1.6/lib/vendor/react-dom.min.js"></script>
    <script src="https://source.zoom.us/3.1.6/lib/vendor/redux.min.js"></script>
    <script src="https://source.zoom.us/3.1.6/lib/vendor/redux-thunk.min.js"></script>
    <script src="https://source.zoom.us/3.1.6/lib/vendor/lodash.min.js"></script>
    <script src="https://source.zoom.us/zoom-meeting-3.1.6.min.js"></script>

    <script>
        ZoomMtg.setZoomJSLib('https://source.zoom.us/3.1.6/lib', '/av');
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();

        const meetingConfig = {
            sdkKey: "${esc(sdkKey)}",
            signature: "${esc(signature)}",
            meetingNumber: "${esc(meetingNumber)}",
            userName: "${esc(userName)}",
            passWord: "${esc(passcode)}",
            leaveUrl: window.location.origin,
            success: (success) => {
                console.log("Zoom success:", success)
                startHeartbeat();
            },
            error: (error) => {
                console.error("Zoom error:", error)
            }
        };

        ZoomMtg.init({
            leaveUrl: meetingConfig.leaveUrl,
            success: () => {
                ZoomMtg.join(meetingConfig);
            },
            error: (res) => {
                console.log(res);
            }
        });

        // Attendance Heartbeat Logic
        const CONFIG = {
          classId: "${esc(classId)}",
          jwt: "${esc(playerJwt)}",
          apiUrl: window.location.origin,
          attendanceHeartbeatInterval: ${env.ATTENDANCE_HEARTBEAT_INTERVAL * 1000}
        };

        function startHeartbeat() {
          setInterval(() => {
            const payload = JSON.stringify({
              classId: CONFIG.classId,
              event: 'HEARTBEAT',
              position: 0,
              timestamp: new Date().toISOString(),
              provider: 'zoom_live',
              requestId: 'zoom-' + Math.random().toString(36).substring(2, 10)
            });
            fetch(\`\${CONFIG.apiUrl}/api/v1/attendance/event\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${CONFIG.jwt}\` },
              body: payload
            }).catch(console.error);
          }, CONFIG.attendanceHeartbeatInterval);
        }

        // Watermark time
        function updateTime() { document.getElementById('wm-time').textContent = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); }
        updateTime(); setInterval(updateTime, 1000);
    </script>
</body>
</html>`;
}

export const renderZoomPlayer = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).send('Missing player token');

    const cacheKey = `player:${token}`;
    const tokenDataStr = await redisClient.get(cacheKey);

    if (!tokenDataStr) return res.status(410).send(buildExpiredPage());

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenDataStr);
    } catch {
      return res.status(400).send('Invalid token payload');
    }

    const { videoId, classId, userId, videoTitle, videoType, studentName, studentEmail, sdkSignature, meetingUrl, provider } = tokenData;
    if (!classId || !userId || provider !== 'zoom_live') return res.status(400).send('Invalid Zoom token payload');

    if (!tokenData.used) {
      tokenData.used = true;
      const remaining = await redisClient.call('TTL', cacheKey) as number;
      await redisClient.set(cacheKey, JSON.stringify(tokenData), 'EX', remaining > 0 ? remaining : 300);
    }

    const playerJwt = jwt.sign({ userId, classId }, env.JWT_SECRET || 'fallback_secret', { expiresIn: '4h' });
    const meetingId = meetingUrl?.replace(/[^0-9]/g, '') || '';
    const passcode = ''; // Passcodes could be parsed from the meeting URL if necessary

    const allowedAncestors = env.NODE_ENV !== 'production'
      ? `'self' http://localhost:* http://127.0.0.1:* https://*.nermai.com`
      : `'self' https://*.nermai.com`;
    res.setHeader('Content-Security-Policy', `frame-ancestors ${allowedAncestors}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.send(buildZoomPlayerPage({ 
        meetingNumber: meetingId, 
        signature: sdkSignature, 
        sdkKey: env.ZOOM_SDK_KEY || '', 
        userName: studentName || 'Unknown User', 
        playerJwt, 
        classId, 
        isLive: true, 
        passcode 
    }));
  } catch (error) {
    logger.error('Error rendering zoom player:', error);
    res.status(500).send('Internal Server Error');
  }
};
