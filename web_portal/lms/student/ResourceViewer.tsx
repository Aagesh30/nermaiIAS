import React, { useEffect, useState, lazy, Suspense } from 'react';
import { ResourceApi } from '../core/services';
import { X, ShieldCheck, Download, Maximize2, Minimize2, AlertTriangle, FileText, FileDown, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResourceViewerSkeleton } from '../components/ui/Skeleton';
// @ts-ignore
import logoImg from '../../assets/logo.png';

const SecurePDFViewer = lazy<React.ComponentType<{ url: string }>>(() => import('../components/ui/SecurePDFViewer').then(m => ({ default: m.SecurePDFViewer })));

interface ResourceViewerProps {
  resourceId: string;
  onClose: () => void;
}

export const ResourceViewer: React.FC<ResourceViewerProps> = ({ resourceId, onClose }) => {
  const [resource, setResource] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const [res, acc] = await Promise.all([
          ResourceApi.getResource(resourceId),
          ResourceApi.getAccess(resourceId)
        ]);
        setResource(res.data?.data || res.data);
        setAccess(acc.data?.data || acc.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load resource or access denied.');
      } finally {
        setLoading(false);
      }
    };
    fetchResource();
  }, [resourceId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    // Backend delivers content URL as viewerUrl
    if (!access?.viewerUrl) return;
    const a = document.createElement('a');
    a.href = access.viewerUrl;
    a.download = resource?.title || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f1219]/90 backdrop-blur-xl p-8 flex items-center justify-center">
        <ResourceViewerSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f1219]/95 flex items-center justify-center p-4">
        <div className="bg-[#1a1f2b] border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">{error}</p>
          <button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isSecure = resource?.isSecure;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0f1219] flex flex-col"
      >
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-[#151923] flex items-center justify-between px-6 shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <h1 className="text-white font-semibold flex items-center gap-2">
                {resource?.title}
                {isSecure && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1"><ShieldCheck size={12}/> Secure View</span>}
              </h1>
              <p className="text-xs text-gray-500">{resource?.type} • v{resource?.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isSecure && (
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-white transition-colors">
                <Download size={16} /> Download
              </button>
            )}
            {isSecure && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium">
                <EyeOff size={14} /> Downloads Disabled
              </div>
            )}
            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </header>

        {/* Viewer Content */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {access?.viewerUrl ? (
            // Backend returns viewerType: 'pdf' | 'webview'
            access.viewerType === 'pdf' ? (
              <Suspense fallback={<div className="text-white animate-pulse mt-10">Loading secure viewer module...</div>}>
                <SecurePDFViewer url={access.viewerUrl} />
              </Suspense>
            ) : access.viewerType === 'webview' ? (
              <div className="relative w-full h-full">
                <iframe 
                  src={access.viewerUrl}
                  className="w-full h-full border-none bg-white"
                  title={resource.title}
                />
                {/* Overlay to block the Google Drive "Pop-out" button in the top right */}
                {isSecure && (
                  <div 
                    className="absolute top-0 right-0 w-32 h-20 bg-[#151515]/90 backdrop-blur-xl z-50 select-none cursor-default flex items-center justify-center"
                    title="Pop-out disabled for secure documents"
                  >
                    <img 
                      src={logoImg} 
                      className="w-10 h-10 object-contain opacity-80" 
                      alt="Nermai Logo"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center mt-20">
                <FileDown size={64} className="mx-auto text-gray-500 mb-4" />
                <h3 className="text-xl text-white mb-2">External Resource</h3>
                <p className="text-gray-400 mb-6">Click below to open the resource.</p>
                <a href={access.viewerUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium shadow-lg shadow-purple-500/20 inline-block">
                  Open File
                </a>
              </div>
            )
          ) : (
            <div className="text-center">
              <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl text-white mb-2">Media Not Available</h3>
              <p className="text-gray-400">The source file could not be located.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

