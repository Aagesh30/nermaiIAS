import React, { useEffect, useLayoutEffect, useRef } from 'react';

export const ZoomMeetingPlayer: React.FC<{ joinPayload: any }> = ({ joinPayload }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const renderCount = useRef(0);
  
  renderCount.current++;

  // ── RENDER GATE AUDIT ──────────────────────────────────────────────────────
  // This table answers: why is the iframe not being created?
  const hasJoinPayload  = joinPayload !== null && joinPayload !== undefined;
  const hasToken        = !!joinPayload?.token;
  const tokenLength     = joinPayload?.token?.length ?? 0;
  const tokenPreview    = hasToken ? `${joinPayload.token.substring(0, 12)}...` : '(none)';
  const iframeShouldRender = hasJoinPayload && hasToken;

  console.log(`\n══ ZoomMeetingPlayer RENDER #${renderCount.current} ══════════════════`);
  console.table({
    hasJoinPayload,
    hasToken,
    tokenLength,
    iframeShouldRender,
  });
  console.log('tokenPreview:', tokenPreview, '| timestamp:', Date.now());
  // ──────────────────────────────────────────────────────────────────────────

  // Mount effect (fires once per token change)
  useEffect(() => {
    console.log('[ZoomMeetingPlayer] MOUNTED — token:', tokenPreview, '| timestamp:', Date.now());
    return () => {
      console.log('[ZoomMeetingPlayer] UNMOUNTED — token was:', tokenPreview, '| timestamp:', Date.now());
    };
  }, [joinPayload?.token]);

  // ── DOM EXISTENCE PROBE (useLayoutEffect = synchronous after paint) ────────
  // This fires synchronously after React commits the DOM.
  // If iframeRef.current is null here, the iframe was NOT rendered.
  useLayoutEffect(() => {
    const el = iframeRef.current;
    const domContainer = document.getElementById('zoom-container');
    const iframeInDOM  = !!el;
    const iframeConnected = el?.isConnected ?? false;
    const iframeSrc    = el?.src ?? '(no src)';
    const contentWin   = el ? !!el.contentWindow : false;

    console.log('\n── DOM PROBE (after paint) ─────────────────────────────────────');
    console.table({
      iframeElementExists:   iframeInDOM,
      iframeIsConnected:     iframeConnected,
      iframeSrc:             iframeSrc.substring(0, 60),
      contentWindowExists:   contentWin,
      zoomContainerExists:   !!domContainer,
    });
    console.log('────────────────────────────────────────────────────────────────\n');
  });
  // ──────────────────────────────────────────────────────────────────────────

  if (!iframeShouldRender) {
    console.log('[ZoomMeetingPlayer] ▶ RETURNING LOADER (no token) | render #', renderCount.current);
    return (
      <div className="w-full h-full relative" id="zoom-container">
        <div className="flex items-center justify-center h-full text-white">
          <p>Initializing Zoom SDK...</p>
        </div>
      </div>
    );
  }

  console.log('[ZoomMeetingPlayer] ▶ RETURNING IFRAME | token:', tokenPreview, '| render #', renderCount.current);
  return (
    <div className="w-full h-full relative" id="zoom-container">
      <iframe
        ref={iframeRef}
        key="iframe-static"
        src={`/meeting-hosts/${process.env.EXPO_PUBLIC_ZOOM_RENDERER === 'client' ? 'zoom-client.html' : 'zoom.html'}?token=${joinPayload.token}&apiUrl=${encodeURIComponent('http://127.0.0.1:3000')}`}
        className="w-full h-full border-none absolute inset-0 z-0"
        allow="camera; microphone; display-capture; fullscreen"
        onLoad={() => {
          const el = iframeRef.current;
          console.log('[ZoomMeetingPlayer] iframe onLoad fired:', {
            src: el?.src?.substring(0, 60) ?? '(no src)',
            isConnected: el?.isConnected,
            contentWindow: !!el?.contentWindow,
            timestamp: Date.now(),
          });
        }}
        onError={(e) => {
          console.error('[ZoomMeetingPlayer] iframe onError fired:', e, { timestamp: Date.now() });
        }}
      />
    </div>
  );
};
