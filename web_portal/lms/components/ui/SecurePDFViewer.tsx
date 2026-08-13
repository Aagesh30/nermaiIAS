import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { WatermarkOverlay } from './WatermarkOverlay';

// Set up local worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface SecurePDFViewerProps {
  url: string;
}

export const SecurePDFViewer: React.FC<SecurePDFViewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('pdf-container');
    if (elem) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        elem.requestFullscreen();
      }
    }
  };

  return (
    <div 
      id="pdf-container" 
      className="relative flex flex-col items-center bg-[#1E1E1E] rounded-xl overflow-hidden border border-white/10"
      onContextMenu={preventContextMenu}
      style={{ minHeight: '600px' }}
    >
      {/* Custom Toolbar */}
      <div className="w-full bg-[#121212] p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4 text-white">
          <button 
            disabled={pageNumber <= 1} 
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            className="p-2 hover:bg-white/10 rounded disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button 
            disabled={pageNumber >= (numPages || 1)} 
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || 1))}
            className="p-2 hover:bg-white/10 rounded disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-white">
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 hover:bg-white/10 rounded">
            <ZoomOut size={20} />
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} className="p-2 hover:bg-white/10 rounded">
            <ZoomIn size={20} />
          </button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded">
            <Maximize size={20} />
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="relative w-full flex-1 overflow-auto bg-[#2A2A2A] flex justify-center p-8 custom-scrollbar">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-white animate-pulse">Loading Document...</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={false} 
            renderAnnotationLayer={false} 
          />
        </Document>

        {/* Watermark */}
        <WatermarkOverlay />
      </div>
    </div>
  );
};
