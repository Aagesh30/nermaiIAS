import { Request, Response } from 'express';
import { redisClient } from '../../infrastructure/redis';
import { logger } from '../../core/logger';
import { env } from '../../config/env';

function esc(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildExpiredPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><title>Session Expired — NERMAI ACADEMY</title>
  <style>
    body{margin:0;background:#060913;color:#fff;font-family:'Segoe UI',Arial,sans-serif;
         display:flex;align-items:center;justify-content:center;height:100vh;}
    .box{text-align:center;padding:40px 32px;background:#1E293B;border-radius:16px;
         border:1px solid rgba(255,255,255,.08);max-width:380px;}
    h1{color:#EF4444;font-size:22px;margin-bottom:12px;}
    p{color:#94A3B8;font-size:14px;line-height:1.6;}
    button{margin-top:24px;background:#D4AF37;color:#000;border:none;padding:10px 28px;
           border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;}
    button:hover{background:#C59D2E;}
  </style>
</head>
<body>
  <div class="box">
    <h1>&#9203; Session Expired</h1>
    <p>Your access session has expired.<br/>Go back and reopen the resource.</p>
    <button onclick="window.history.back()">Go Back</button>
  </div>
</body>
</html>`;
}

function buildMobileViewerPage({ resourceId, token, title, studentName, studentEmail, apiUrl }: any) {
  // Using the backend secure stream URL
  const pdfUrl = `${apiUrl}/api/v1/resources/${esc(resourceId)}/secure-stream`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${esc(title)} — Secure Viewer</title>
  <script src="/pdfjs/pdf.min.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111;
      width: 100vw; height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* Toolbar */
    #toolbar {
      height: 50px;
      background: #1B1B1B;
      border-bottom: 1px solid rgba(212,175,55,0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: white;
      z-index: 10;
    }
    .toolbar-group { display: flex; items-center; gap: 12px; }
    button {
      background: transparent; border: none; color: white; font-size: 18px;
      width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    }
    button:active { background: rgba(255,255,255,0.1); }
    button:disabled { opacity: 0.3; pointer-events: none; }
    #page_num { font-family: monospace; font-size: 14px; }
    
    /* PDF Container */
    #pdf-container {
      flex: 1;
      overflow: auto;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #222;
      padding: 16px;
    }
    canvas {
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      max-width: 100%;
    }
    
    /* Watermark */
    #watermark-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9999; overflow: hidden;
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      opacity: 0.15;
    }
    .wm-item {
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      color: #FFF;
      transform: rotate(-30deg);
      margin: 40px;
      text-align: center;
      white-space: pre-line;
      text-shadow: 1px 1px 2px #000;
    }
    
    #loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #D4AF37; font-family: sans-serif; font-size: 16px;
    }
  </style>
</head>
<body>
  
  <div id="toolbar">
    <div class="toolbar-group">
      <button id="zoom_out">−</button>
      <button id="zoom_in">+</button>
    </div>
    <div class="toolbar-group">
      <button id="prev">◀</button>
      <span id="page_num"></span>
      <button id="next">▶</button>
    </div>
  </div>

  <div id="pdf-container">
    <div id="loading">Loading Secure Document...</div>
    <div id="pages-wrapper"></div>
  </div>

  <div id="watermark-overlay"></div>

  <script>
    const postEvent = (step, message) => {
      console.log("[" + step + "] " + message);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: "viewer-log", 
          step: step, 
          message: message,
          event: message,
          timeMs: performance.now() 
        }));
      }
    };

    window.onerror = function(msg, url, lineNo, columnNo, error) {
      const errStr = msg + " at " + lineNo + ":" + columnNo;
      postEvent("ERROR", errStr);
      return false;
    };
    window.onunhandledrejection = function(event) {
      postEvent("PROMISE_ERROR", event.reason);
    };

    postEvent(1, "HTML Loaded");
    
    let pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = window.innerWidth < 600 ? 0.6 : 1.0,
        canvasWrapper = document.getElementById('pages-wrapper');

    // Generate Watermark Grid - FIXED SYNTAX ERROR HERE
    const wmContainer = document.getElementById('watermark-overlay');
    const wmText = "${esc(studentName)}\\n${esc(studentEmail)}\\n" + new Date().toISOString().split('T')[0];
    for (let i = 0; i < 20; i++) {
      let div = document.createElement('div');
      div.className = 'wm-item';
      div.innerText = wmText;
      wmContainer.appendChild(div);
    }

    function renderPage(num) {
      pageRendering = true;
      pdfDoc.getPage(num).then(function(page) {
        let viewport = page.getViewport({ scale: scale });
        
        // Match container width if on mobile
        if (scale === 0.6 && window.innerWidth < viewport.width) {
            scale = (window.innerWidth - 32) / (viewport.width / scale);
            viewport = page.getViewport({ scale: scale });
        }

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        canvasWrapper.innerHTML = '';
        canvasWrapper.appendChild(canvas);

        let renderContext = { canvasContext: ctx, viewport: viewport };
        let renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
          if (!window.__firstPageRendered) {
            window.__firstPageRendered = true;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'First Page Rendered', timeMs: performance.now() }));
            }
          }
          pageRendering = false;
          if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      });

      document.getElementById('page_num').textContent = num + " / " + pdfDoc.numPages;
      document.getElementById('prev').disabled = num <= 1;
      document.getElementById('next').disabled = num >= pdfDoc.numPages;
    }

    function queueRenderPage(num) {
      if (pageRendering) pageNumPending = num;
      else renderPage(num);
    }

    document.getElementById('prev').addEventListener('click', () => { if (pageNum <= 1) return; pageNum--; queueRenderPage(pageNum); });
    document.getElementById('next').addEventListener('click', () => { if (pageNum >= pdfDoc.numPages) return; pageNum++; queueRenderPage(pageNum); });
    
    document.getElementById('zoom_in').addEventListener('click', () => { scale += 0.2; queueRenderPage(pageNum); });
    document.getElementById('zoom_out').addEventListener('click', () => { scale = Math.max(0.4, scale - 0.2); queueRenderPage(pageNum); });

    if (typeof pdfjsLib !== 'undefined') {
      postEvent(2, "pdf.js script found");
    } else {
      postEvent("ERROR", "pdf.js script NOT found");
    }
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
    postEvent(3, "Worker configured");

    postEvent(4, "Creating loadingTask");
    const loadingTask = pdfjsLib.getDocument({
      url: "${pdfUrl}",
      httpHeaders: {
        'Authorization': 'Bearer ${esc(token)}'
      }
    });
    
    postEvent(5, "Sending request");
    
    // Attempt to track first byte via progress event
    loadingTask.onProgress = function (progressData) {
      if (!window.__firstByteLogged && progressData.loaded > 0) {
        window.__firstByteLogged = true;
        postEvent(6, "Response headers received / First byte");
      }
    };

    loadingTask.promise.then(function(pdfDoc_) {
      document.getElementById('loading').style.display = 'none';
      pdfDoc = pdfDoc_;
      renderPage(pageNum);
    }).catch(err => {
      document.getElementById('loading').textContent = "Failed to load document. " + err.message;
      document.getElementById('loading').style.color = '#EF4444';
      postEvent("ERROR", "Document Load Failed: " + err.message);
    });

    // Anti-inspection
    document.addEventListener('contextmenu', e => e.preventDefault());
  </script>
</body>
</html>`;
}

export const renderMobileViewer = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).send('Missing viewer token');

    const cacheKey = `resource:${token}`;
    const tokenDataStr = await redisClient.get(cacheKey);

    if (!tokenDataStr) return res.status(410).send(buildExpiredPage());

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenDataStr);
    } catch {
      return res.status(400).send('Invalid token payload');
    }

    const { resourceId, studentName, studentEmail } = tokenData;
    if (!resourceId) return res.status(400).send('Incomplete token payload');

    const apiUrl = env.NODE_ENV === 'production' ? 'https://api.nermai.com' : `${req.protocol}://${req.get('host')}`;

    // Security headers tailored for WebView
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const html = buildMobileViewerPage({ 
      resourceId, 
      token, 
      title: 'Resource Viewer', 
      studentName: studentName || 'Unknown User', 
      studentEmail: studentEmail || '',
      apiUrl
    });

    console.log("Serving viewer.html");
    console.log(html.substring(0, 300));

    console.log(`
========== VIEWER ==========
Viewer Requested
Token Valid
YES
Resource
${resourceId}
Returning HTML
YES
==============================`);

    res.send(html);
  } catch (error) {
    logger.error('Error rendering mobile viewer:', error);
    res.status(500).send('Internal Server Error');
  }
};
