import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, BookOpen, FileText, RefreshCw, ChevronsDown } from 'lucide-react';
import { WatermarkOverlay } from './WatermarkOverlay';

// Set up CDN worker matching the exact version used by react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SecurePDFViewerProps {
  url: string;
}

export const SecurePDFViewer: React.FC<SecurePDFViewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [viewMode, setViewMode] = useState<'single' | 'book'>('single');
  // Tracks whether the viewer is scrolled near the bottom (to show next-page hint)
  const [atScrollBottom, setAtScrollBottom] = useState(false);

  // Detect portrait vs landscape orientation
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: portrait)').matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Portrait always forces single-page; landscape respects user toggle
  const effectiveViewMode = isPortrait ? 'single' : viewMode;
  const pageStep = effectiveViewMode === 'book' ? 2 : 1;

  const viewerRef = useRef<HTMLDivElement>(null);
  // Cooldown ref prevents multiple rapid page jumps from a single scroll/swipe
  const pageCooldownRef = useRef(false);
  const touchStartYRef = useRef(0);

  // ── Auto-fit ──────────────────────────────────────────────────────────────
  const computeAutoFit = useCallback(() => {
    if (viewerRef.current) {
      const padding = 16; // p-2 = 8px each side
      const containerW = viewerRef.current.clientWidth - padding * 2;
      // Book view: two pages (612px each) + 12px gap
      const targetW = effectiveViewMode === 'book' ? 612 * 2 + 12 : 612;
      const autoScale = Math.max(0.3, Math.min(2.5, containerW / targetW));
      setScale(parseFloat(autoScale.toFixed(2)));
    }
  }, [effectiveViewMode]);

  useEffect(() => {
    computeAutoFit();
    window.addEventListener('resize', computeAutoFit);
    return () => window.removeEventListener('resize', computeAutoFit);
  }, [computeAutoFit]);

  // ── Page navigation helpers ───────────────────────────────────────────────
  const goNextPage = useCallback(() => {
    if (pageCooldownRef.current) return;
    if (pageNumber >= (numPages || 1)) return;
    pageCooldownRef.current = true;
    setPageNumber(prev => Math.min(prev + pageStep, numPages || 1));
    // Reset scroll to top of new page after render
    setTimeout(() => {
      if (viewerRef.current) viewerRef.current.scrollTop = 0;
      pageCooldownRef.current = false;
    }, 350);
  }, [pageNumber, numPages, pageStep]);

  const goPrevPage = useCallback(() => {
    if (pageCooldownRef.current) return;
    if (pageNumber <= 1) return;
    pageCooldownRef.current = true;
    setPageNumber(prev => Math.max(prev - pageStep, 1));
    // Scroll to bottom of previous page so nav feels natural
    setTimeout(() => {
      if (viewerRef.current) viewerRef.current.scrollTop = viewerRef.current.scrollHeight;
      pageCooldownRef.current = false;
    }, 350);
  }, [pageNumber, pageStep]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    computeAutoFit();
    if (viewerRef.current) viewerRef.current.scrollTop = 0;
  };

  // ── Scroll tracking ───────────────────────────────────────────────────────
  // Updates atScrollBottom so we know when to show the "Next page" hint
  const handleScroll = useCallback(() => {
    const el = viewerRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    setAtScrollBottom(nearBottom);
  }, []);

  // ── Wheel (desktop): page-turn at scroll boundaries ──────────────────────
  // Only fires in single-page mode; normal scrolling within the page is untouched
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (effectiveViewMode !== 'single') return;
    const el = viewerRef.current;
    if (!el) return;

    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
    const atTop = el.scrollTop <= 5;

    if (e.deltaY > 0 && atBottom) {
      goNextPage();
    } else if (e.deltaY < 0 && atTop) {
      goPrevPage();
    }
  }, [effectiveViewMode, goNextPage, goPrevPage]);

  // ── Touch (mobile): swipe at scroll boundaries ────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (effectiveViewMode !== 'single') return;
    const el = viewerRef.current;
    if (!el) return;

    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    const atTop = el.scrollTop <= 10;

    // Swipe up (deltaY > 40) at bottom → next page
    if (deltaY > 40 && atBottom) {
      goNextPage();
    // Swipe down (deltaY < -40) at top → previous page
    } else if (deltaY < -40 && atTop) {
      goPrevPage();
    }
  }, [effectiveViewMode, goNextPage, goPrevPage]);

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('pdf-container');
    if (elem) {
      document.fullscreenElement
        ? document.exitFullscreen()
        : elem.requestFullscreen();
    }
  };

  // Toolbar button nav: reset scroll too
  const handleToolbarPrev = () => {
    if (pageNumber <= 1) return;
    setPageNumber(prev => Math.max(prev - pageStep, 1));
    setTimeout(() => { if (viewerRef.current) viewerRef.current.scrollTop = 0; }, 50);
  };
  const handleToolbarNext = () => {
    if (pageNumber >= (numPages || 1)) return;
    setPageNumber(prev => Math.min(prev + pageStep, numPages || 1));
    setTimeout(() => { if (viewerRef.current) viewerRef.current.scrollTop = 0; }, 50);
  };

  return (
    <div
      id="pdf-container"
      className="relative flex flex-col w-full bg-[#1E1E1E] rounded-xl overflow-hidden border border-white/10"
      onContextMenu={preventContextMenu}
      style={{ height: '100%', minHeight: 0 }}
    >
      {/* ── Toolbar ── */}
      <div className="w-full bg-[#121212] px-3 py-2 flex flex-wrap items-center justify-between gap-y-2 border-b border-white/10 shrink-0">

        {/* LEFT: Page nav + Book/Single toggle */}
        <div className="flex items-center gap-1 sm:gap-2 text-white">

          <button
            disabled={pageNumber <= 1}
            onClick={handleToolbarPrev}
            className="p-2 hover:bg-white/10 rounded disabled:opacity-40 transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-sm font-medium whitespace-nowrap">
            Page {pageNumber}
            {effectiveViewMode === 'book' && pageNumber + 1 <= (numPages || 1)
              ? `–${pageNumber + 1}`
              : ''}
            {' '}of {numPages || '--'}
          </span>

          <button
            disabled={pageNumber >= (numPages || 1)}
            onClick={handleToolbarNext}
            className="p-2 hover:bg-white/10 rounded disabled:opacity-40 transition-colors"
            title="Next page"
          >
            <ChevronRight size={20} />
          </button>

          {/* Book/Single toggle — hidden in portrait, shown in landscape + desktop */}
          {!isPortrait && (
            <div className="flex items-center gap-0.5 ml-2 bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'single'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Single Page View"
              >
                <FileText size={13} />
                <span>Single</span>
              </button>
              <button
                onClick={() => setViewMode('book')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'book'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Book View (Two Pages)"
              >
                <BookOpen size={13} />
                <span>Book</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Zoom + Auto-fit + Fullscreen */}
        <div className="flex items-center gap-1 text-white">
          <button
            onClick={() => setScale(s => parseFloat(Math.max(s - 0.15, 0.3).toFixed(2)))}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>

          <span className="text-xs font-mono w-10 text-center select-none">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => setScale(s => parseFloat(Math.min(s + 0.15, 2.5).toFixed(2)))}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>

          <button
            onClick={computeAutoFit}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Auto-fit to width"
          >
            <RefreshCw size={16} />
          </button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Fullscreen"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* ── Viewer Area ──
          min-h-0 prevents blank space below by keeping flex child bounded.
          onWheel + onTouchStart/End handle scroll-based page turning. */}
      <div
        ref={viewerRef}
        className="relative w-full flex-1 min-h-0 overflow-auto bg-[#2A2A2A] flex justify-center items-start p-2 custom-scrollbar"
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="text-white animate-pulse py-16 text-sm">
              Loading Document...
            </div>
          }
        >
          {effectiveViewMode === 'book' ? (
            /* BOOK VIEW — landscape mobile + desktop only */
            <div className="flex gap-3 items-start">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              {pageNumber + 1 <= (numPages || 1) ? (
                <Page
                  pageNumber={pageNumber + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              ) : (
                /* Blank placeholder for odd last page */
                <div
                  style={{
                    width: `${Math.round(612 * scale)}px`,
                    height: `${Math.round(792 * scale)}px`,
                  }}
                  className="bg-white/10 rounded shadow-lg border border-white/10 flex items-center justify-center shrink-0"
                >
                  <span className="text-white/20 text-xs select-none">End of Document</span>
                </div>
              )}
            </div>
          ) : (
            /* SINGLE VIEW */
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          )}
        </Document>

        {/* SECURITY: WatermarkOverlay — always rendered, never conditional */}
        <WatermarkOverlay />
      </div>

      {/* ── Next-page hint button ─────────────────────────────────────────────
          Appears at bottom when:
          • Single-page mode
          • User has scrolled to the bottom of the current page
          • There is a next page available
          Clickable shortcut + visual cue for scroll-to-advance behaviour */}
      {effectiveViewMode === 'single' && pageNumber < (numPages || 1) && atScrollBottom && (
        <button
          onClick={goNextPage}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full text-white/80 hover:text-white text-xs font-medium transition-all border border-white/15 z-50 animate-bounce"
          title="Go to next page"
        >
          <ChevronsDown size={14} />
          Next page
        </button>
      )}
    </div>
  );
};
