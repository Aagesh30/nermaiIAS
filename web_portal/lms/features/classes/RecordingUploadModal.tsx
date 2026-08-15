import React, { useState } from 'react';
import { CourseApi } from '@nermai/api';
import { X, UploadCloud, Link as LinkIcon, Loader2, Video, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecordingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  onSuccess: () => void;
}

export const RecordingUploadModal: React.FC<RecordingUploadModalProps> = ({ isOpen, onClose, classId, onSuccess }) => {
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (uploadMode === 'file') {
        if (!file) throw new Error('Please select a video file.');
        formData.append('recording', file);
      } else {
        if (!url) throw new Error('Please provide a URL.');
        formData.append('recordingUrl', url);
        formData.append('provider', url.includes('youtube') ? 'youtube' : 'external');
      }

      // We use uploadClassRecording endpoint which expects PUT /classes/:id/recording
      await CourseApi.uploadClassRecording(classId, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to attach recording');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#1a1f2b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <Video size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Attach Recording</h2>
                <p className="text-xs text-gray-400">Make the session available on-demand</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                <X size={16} /> {error}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setUploadMode('file')} 
                className={`flex-1 py-2 text-sm font-medium rounded-xl flex items-center justify-center gap-2 border transition-all ${uploadMode === 'file' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
              >
                <UploadCloud size={16} /> Video File
              </button>
              <button 
                type="button" 
                onClick={() => setUploadMode('link')} 
                className={`flex-1 py-2 text-sm font-medium rounded-xl flex items-center justify-center gap-2 border transition-all ${uploadMode === 'link' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
              >
                <LinkIcon size={16} /> External Link
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div className="border-2 border-dashed border-gray-700 hover:border-purple-500/50 rounded-xl p-8 flex flex-col items-center justify-center bg-black/20 text-center relative overflow-hidden group transition-colors">
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={e => setFile(e.target.files?.[0] || null)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                {file ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-emerald-400 font-medium">{file.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{(file.size / (1024*1024)).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-gray-500 mb-3 group-hover:text-purple-400 transition-colors" />
                    <p className="text-gray-300 font-medium">Click or drag video to upload</p>
                    <p className="text-gray-500 text-xs mt-1">MP4, WebM (Max 2GB)</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Video URL (YouTube, Vimeo, etc.)</label>
                <input 
                  value={url} 
                  onChange={e=>setUrl(e.target.value)} 
                  type="url" 
                  placeholder="https://..." 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all" 
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading} 
                className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : 'Publish Recording'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
