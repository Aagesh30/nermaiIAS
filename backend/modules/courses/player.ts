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
    html, body {
      background: #000;
      width: 100%; height: 100%;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      cursor: default;
    }
    #player-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
    }
    #frame {
      width: 100%; height: 100%;
      border: none; display: block;
      pointer-events: none; /* Disables all native YouTube clicks & hover popups */
    }
    /* Pointer & Interaction Shield over YouTube Iframe */
    #interaction-shield {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 10;
      background: transparent;
      cursor: pointer;
    }
    /* Big Center Play Button Overlay */
    #center-play-overlay {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 20;
      width: 68px; height: 68px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
    }
    #center-play-overlay:hover {
      transform: translate(-50%, -50%) scale(1.1);
      background: rgba(15, 23, 42, 0.95);
      border-color: #38bdf8;
      color: #38bdf8;
    }
    #center-play-overlay.playing {
      opacity: 0;
      pointer-events: none;
    }
    /* End Screen Overlay to completely cover YouTube related videos */
    #end-screen-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 25;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 24px;
      text-align: center;
    }
    #end-screen-overlay.active {
      display: flex;
    }
    #end-screen-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #f8fafc;
    }
    #end-screen-sub {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .replay-btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      border: none;
      padding: 12px 28px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
      transition: all 0.2s;
    }
    .replay-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
    }
    /* Custom Controls Bar */
    #custom-controls {
      position: absolute;
      bottom: 0; left: 0;
      width: 100%;
      height: 68px;
      z-index: 30;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #custom-controls.hidden {
      opacity: 0;
      transform: translateY(100%);
      pointer-events: none;
    }
    .ctrl-btn {
      background: transparent;
      border: none;
      color: #e2e8f0;
      font-size: 16px;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .ctrl-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #38bdf8;
    }
    #ctrl-time {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      white-space: nowrap;
      flex-shrink: 0;
      min-width: 90px;
    }
    /* Scrubber Track */
    .scrubber-container {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      height: 24px;
      cursor: pointer;
    }
    .scrubber-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    }
    .scrubber-fill {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      background: #38bdf8;
      border-radius: 2px;
      width: 0%;
    }
    .scrubber-input {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      opacity: 0;
      cursor: pointer;
      margin: 0;
    }
    /* Volume group */
    .vol-container {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .vol-slider {
      width: 60px;
      height: 4px;
      accent-color: #38bdf8;
      cursor: pointer;
    }
    /* Watermark inside controls */
    .secure-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.6px;
      user-select: none;
      flex-shrink: 0;
    }
    @media (max-width: 640px) {
      .vol-slider, .secure-badge { display: none; }
      #ctrl-time { font-size: 11px; min-width: 70px; }
      #custom-controls { padding: 0 10px; gap: 8px; }
    }
    /* Floating Watermark */
    #watermark {
      position: absolute; top: 12px; right: 12px; z-index: 40;
      padding: 4px 10px; border-radius: 6px; background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1); pointer-events: none;
      display: flex; flex-direction: column; text-align: right;
    }
    .wm-name  { font-size: 10px; font-weight: 700; color: #FFD54F; }
    .wm-email { font-size: 8px; color: #94a3b8; }
    ${isLive ? `
    #live-badge {
      position: fixed; top: 14px; left: 14px; background: #E53935; color: #fff; padding: 3px 12px; border-radius: 4px;
      font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1.2px; z-index: 40;
      animation: pulse 1.8s ease-in-out infinite; pointer-events: none;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.65} }
    ` : ''}
  </style>
</head>
<body>
  <div id="player-wrapper">
    <div id="frame"></div>
    <div id="interaction-shield"></div>
    
    <div id="center-play-overlay">▶</div>

    <div id="end-screen-overlay">
      <div id="end-screen-title">${esc(videoTitle)}</div>
      <div id="end-screen-sub">Lesson Completed</div>
      <button class="replay-btn" id="replay-btn">
        <span>🔄</span> Replay Video
      </button>
    </div>

    <div id="watermark">
      <span class="wm-name">${esc(studentName)}</span>
      <span class="wm-email">${esc(studentEmail)}</span>
    </div>

    ${isLive ? '<div id="live-badge">&#128308; LIVE</div>' : ''}

    <div id="custom-controls">
      <button class="ctrl-btn" id="ctrl-play-btn" title="Play/Pause">▶</button>
      <span id="ctrl-time">0:00 / 0:00</span>
      <div class="scrubber-container">
        <div class="scrubber-track">
          <div class="scrubber-fill" id="scrubber-fill"></div>
        </div>
        <input type="range" id="ctrl-scrubber" class="scrubber-input" min="0" max="100" value="0" step="0.1" />
      </div>
      <div class="vol-container">
        <button class="ctrl-btn" id="ctrl-mute-btn" title="Mute/Unmute">🔊</button>
        <input type="range" id="ctrl-vol-slider" class="vol-slider" min="0" max="100" value="100" />
      </div>
      <div class="secure-badge">
        <span>🛡️</span> <span>NERMAI SECURE</span>
      </div>
      <button class="ctrl-btn" id="ctrl-fs-btn" title="Toggle Fullscreen">⛶</button>
    </div>
  </div>
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

  // MUST be defined before the YouTube iframe_api script tag below so that
  // the callback is available even when the script is served from browser cache
  // (cached scripts execute synchronously, before the rest of this block).
  function onYouTubeIframeAPIReady() {
    console.log('[Attendance] Player Loaded');
    player = new YT.Player('frame', {
      height: '100%',
      width: '100%',
      videoId: CONFIG.videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
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
</script>
<!-- Load YouTube iframe API AFTER defining onYouTubeIframeAPIReady above.
     This guarantees the callback exists before YouTube's script (cached or
     not) tries to invoke it, fixing the black-screen on second video load. -->
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  // Belt-and-suspenders: if YT was already fully initialised before the
  // script tag above ran (e.g. very aggressive caching), fire manually.
  if (window.YT && typeof window.YT.Player === 'function' && !player) {
    onYouTubeIframeAPIReady();
  }

  // --- Custom Controls & Interaction Logic ---
  let isSeeking = false;
  let hideControlsTimer = null;

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateScrubber() {
    if (!player || typeof player.getCurrentTime !== 'function' || isSeeking) return;
    const current = player.getCurrentTime() || 0;
    const duration = player.getDuration() || 0;
    const fill = document.getElementById('scrubber-fill');
    const input = document.getElementById('ctrl-scrubber');
    const timeEl = document.getElementById('ctrl-time');
    
    if (duration > 0) {
      const pct = (current / duration) * 100;
      if (fill) fill.style.width = pct + '%';
      if (input) input.value = pct;
      if (timeEl) timeEl.textContent = formatTime(current) + ' / ' + formatTime(duration);
    }
  }

  function initCustomControls() {
    const wrapper = document.getElementById('player-wrapper');
    const shield = document.getElementById('interaction-shield');
    const centerBtn = document.getElementById('center-play-overlay');
    const playBtn = document.getElementById('ctrl-play-btn');
    const scrubber = document.getElementById('ctrl-scrubber');
    const fill = document.getElementById('scrubber-fill');
    const muteBtn = document.getElementById('ctrl-mute-btn');
    const volSlider = document.getElementById('ctrl-vol-slider');
    const fsBtn = document.getElementById('ctrl-fs-btn');
    const controls = document.getElementById('custom-controls');
    const endOverlay = document.getElementById('end-screen-overlay');
    const replayBtn = document.getElementById('replay-btn');

    function togglePlay() {
      if (!player) return;
      const state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        if (endOverlay) endOverlay.classList.remove('active');
        player.playVideo();
      }
    }

    if (shield) shield.addEventListener('click', togglePlay);
    if (centerBtn) centerBtn.addEventListener('click', togglePlay);
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (replayBtn) replayBtn.addEventListener('click', () => {
      if (endOverlay) endOverlay.classList.remove('active');
      if (player) { player.seekTo(0, true); player.playVideo(); }
    });

    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        isSeeking = true;
        const pct = parseFloat(e.target.value);
        if (fill) fill.style.width = pct + '%';
      });
      scrubber.addEventListener('change', (e) => {
        if (!player || typeof player.getDuration !== 'function') return;
        const duration = player.getDuration() || 0;
        const pct = parseFloat(e.target.value);
        const targetTime = duration * (pct / 100);
        player.seekTo(targetTime, true);
        isSeeking = false;
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        if (!player) return;
        if (player.isMuted()) {
          player.unMute();
          muteBtn.textContent = '🔊';
        } else {
          player.mute();
          muteBtn.textContent = '🔇';
        }
      });
    }

    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        if (!player) return;
        const val = parseInt(e.target.value, 10);
        player.setVolume(val);
        if (val === 0) player.mute(); else player.unMute();
        if (muteBtn) muteBtn.textContent = val === 0 ? '🔇' : '🔊';
      });
    }

    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (wrapper.requestFullscreen) wrapper.requestFullscreen();
          else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
      });
    }

    // Auto-hide controls on mouse idle
    function resetHideControlsTimer() {
      if (controls) controls.classList.remove('hidden');
      if (hideControlsTimer) clearTimeout(hideControlsTimer);
      hideControlsTimer = setTimeout(() => {
        if (player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
          if (controls) controls.classList.add('hidden');
        }
      }, 3500);
    }

    if (wrapper) {
      wrapper.addEventListener('mousemove', resetHideControlsTimer);
      wrapper.addEventListener('touchstart', resetHideControlsTimer);
    }

    setInterval(updateScrubber, 250);
  }

  function onPlayerReady(event) {
    initCustomControls();

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
    const centerBtn = document.getElementById('center-play-overlay');
    const playBtn = document.getElementById('ctrl-play-btn');
    const endOverlay = document.getElementById('end-screen-overlay');

    if (event.data === YT.PlayerState.PLAYING) {
      if (centerBtn) centerBtn.classList.add('playing');
      if (playBtn) playBtn.textContent = '❚❚';
      if (endOverlay) endOverlay.classList.remove('active');
    } else if (event.data === YT.PlayerState.PAUSED) {
      if (centerBtn) centerBtn.classList.remove('playing');
      if (playBtn) playBtn.textContent = '▶';
    } else if (event.data === YT.PlayerState.ENDED) {
      if (centerBtn) centerBtn.classList.remove('playing');
      if (playBtn) playBtn.textContent = '▶';
      if (endOverlay) endOverlay.classList.add('active');
    }
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
    console.log('[Attendance] HEARTBEAT Disabled (Simple tracking mode)');
  }

  function sendHeartbeat(forceFlush = false, customEvent = 'HEARTBEAT') {
    // Disabled as per simplified attendance requirement
  }

  // Immediate sync on hidden tab
  document.addEventListener("visibilitychange", () => {
    // Disabled
  });

  // Handle Unload (Flush)
  window.addEventListener('beforeunload', () => {
    // Disabled
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
      ? `'self' http://localhost:* http://127.0.0.1:* https://*.nermai.com https://nermaiiasacademy-519c8.web.app`
      : `'self' https://*.nermai.com https://nermaiiasacademy-519c8.web.app`;
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

    let finalStudentName = studentName;
    let finalStudentEmail = studentEmail;

    if (!finalStudentName || finalStudentName === 'Student' || !finalStudentEmail) {
      try {
        const { db } = require('../../infrastructure/firebase');
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          finalStudentName = uData.displayName || uData.name || uData.fullName || (uData.firstName ? `${uData.firstName} ${uData.lastName || ''}`.trim() : '') || finalStudentName || 'Student';
          finalStudentEmail = uData.email || finalStudentEmail || '';
        } else {
          const studentDoc = await db.collection('students').doc(userId).get();
          if (studentDoc.exists) {
            const sData = studentDoc.data();
            finalStudentName = sData.displayName || sData.name || sData.fullName || (sData.firstName ? `${sData.firstName} ${sData.lastName || ''}`.trim() : '') || finalStudentName || 'Student';
            finalStudentEmail = sData.email || finalStudentEmail || '';
          }
        }
      } catch (e) {
        logger.warn('[Player] User lookup fallback error:', e);
      }
    }

    res.send(buildPlayerPage({ videoId, classId, playerJwt, videoTitle, studentName: finalStudentName, studentEmail: finalStudentEmail, isLive, resumePosition }));
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
          console.log('[Attendance] Zoom Heartbeat Disabled (Simple mode)');
        }

        window.addEventListener('beforeunload', () => {
          // Disabled
        });

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
