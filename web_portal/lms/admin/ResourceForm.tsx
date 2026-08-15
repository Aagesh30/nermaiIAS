import React, { useState, useEffect } from 'react';
import { X, UploadCloud, Link as LinkIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { ResourceApi  } from '../core/services';
import { CourseApi  } from '../core/services';
import { BatchApi  } from '../core/services';

interface ResourceFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function ResourceForm({ onClose, onSuccess, initialData }: ResourceFormProps) {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Lookups
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // 1. Basic Info
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [type, setType] = useState(initialData?.type || 'PDF');
  
  // 2. Extended Metadata
  const [author, setAuthor] = useState(initialData?.author || '');
  const [language, setLanguage] = useState(initialData?.language || 'English');
  const [readingTimeMins, setReadingTimeMins] = useState(initialData?.readingTimeMins || '');
  const [pageCount, setPageCount] = useState(initialData?.pageCount || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');

  // 3. Category & Display
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || 'reference');
  const [displayGroup, setDisplayGroup] = useState(initialData?.displayGroup || 'normal');
  const [offlineAvailable, setOfflineAvailable] = useState(initialData?.offlineAvailable !== false);
  const [isSecure, setIsSecure] = useState(initialData?.isSecure !== false);
  
  // 4. Publishing & Visibility
  const [status, setStatus] = useState(initialData?.status || 'published');
  const [visibility, setVisibility] = useState(initialData?.visibility || 'public');
  const [targetBatchIds, setTargetBatchIds] = useState<string>(initialData?.targetBatchIds?.join(',') || '');
  
  // 5. Distribution Rules
  const [isGeneral, setIsGeneral] = useState(initialData?.isGeneral || false);
  const [distributions, setDistributions] = useState<any[]>([]);

  // 6. Source
  const [uploadMode, setUploadMode] = useState<'file' | 'drive' | 'firebase'>(
    initialData?.provider === 'google_drive' || initialData?.provider === 'external_link' ? 'drive' :
    initialData?.provider === 'firebase_asset' ? 'firebase' : 'file'
  );
  const [externalUrl, setExternalUrl] = useState(initialData?.sourceUrl || '');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes, tRes, clRes, bRes] = await Promise.all([
          CourseApi.listCourses(),
          CourseApi.listAllSubjects(),
          CourseApi.listAllTopics(),
          CourseApi.listAllClasses(),
          BatchApi.listBatches()
        ]);
        setCourses(cRes.data.data || cRes.data);
        setSubjects(sRes.data.data || sRes.data);
        setTopics(tRes.data.data || tRes.data);
        setClasses(clRes.data.data || clRes.data);
        setBatches(bRes.data.data || bRes.data);
        
        // Map initialData back to distributions
        if (initialData) {
          const initDists: any[] = [];
          initialData.courseIds?.forEach((id: string) => initDists.push({ type: 'course', courseId: id }));
          initialData.subjectIds?.forEach((id: string) => {
            const subj = (sRes.data.data || sRes.data).find((s:any) => s.id === id);
            initDists.push({ type: 'subject', courseId: subj?.courseId || '', subjectId: id });
          });
          initialData.topicIds?.forEach((id: string) => {
            const top = (tRes.data.data || tRes.data).find((t:any) => t.id === id);
            const subj = (sRes.data.data || sRes.data).find((s:any) => s.id === top?.subjectId);
            initDists.push({ type: 'topic', courseId: subj?.courseId || '', subjectId: top?.subjectId || '', topicId: id });
          });
          initialData.classIds?.forEach((id: string) => {
            const cls = (clRes.data.data || clRes.data).find((c:any) => c.id === id);
            const top = (tRes.data.data || tRes.data).find((t:any) => t.id === cls?.topicId);
            const subj = (sRes.data.data || sRes.data).find((s:any) => s.id === top?.subjectId);
            initDists.push({ type: 'class', courseId: subj?.courseId || '', subjectId: top?.subjectId || '', topicId: cls?.topicId || '', classId: id });
          });
          setDistributions(initDists);
        }
      } catch (err) {
        console.error('Failed to load lookups', err);
      } finally {
        setInitLoading(false);
      }
    };
    fetchData();
  }, [initialData]);

  const addDistribution = () => {
    setDistributions([...distributions, { type: 'course', courseId: '', subjectId: '', topicId: '', classId: '' }]);
  };

  const removeDistribution = (index: number) => {
    const newDists = [...distributions];
    newDists.splice(index, 1);
    setDistributions(newDists);
  };

  const updateDistribution = (index: number, field: string, value: string) => {
    const newDists = [...distributions];
    newDists[index][field] = value;
    // Reset children
    if (field === 'type') {
      newDists[index].courseId = '';
      newDists[index].subjectId = '';
      newDists[index].topicId = '';
      newDists[index].classId = '';
    }
    if (field === 'courseId') {
      newDists[index].subjectId = '';
      newDists[index].topicId = '';
      newDists[index].classId = '';
    }
    if (field === 'subjectId') {
      newDists[index].topicId = '';
      newDists[index].classId = '';
    }
    if (field === 'topicId') {
      newDists[index].classId = '';
    }
    setDistributions(newDists);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Build Arrays from distributions
      const courseIds = new Set<string>();
      const subjectIds = new Set<string>();
      const topicIds = new Set<string>();
      const classIds = new Set<string>();

      distributions.forEach(d => {
        if (d.type === 'course' && d.courseId) courseIds.add(d.courseId);
        if (d.type === 'subject' && d.subjectId) subjectIds.add(d.subjectId);
        if (d.type === 'topic' && d.topicId) topicIds.add(d.topicId);
        if (d.type === 'class' && d.classId) classIds.add(d.classId);
      });

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('type', type);
      formData.append('categoryId', categoryId);
      formData.append('displayGroup', displayGroup);
      formData.append('visibility', visibility);
      formData.append('status', status);
      formData.append('isGeneral', isGeneral.toString());
      formData.append('offlineAvailable', offlineAvailable.toString());
      formData.append('isSecure', (visibility === 'public' ? isSecure : true).toString());
      
      if (author) formData.append('author', author);
      if (language) formData.append('language', language);
      if (readingTimeMins) formData.append('readingTimeMins', readingTimeMins);
      if (pageCount) formData.append('pageCount', pageCount);
      if (tags) formData.append('tags', JSON.stringify(tags.split(',').map((t: string)=>t.trim()).filter(Boolean)));
  
      // Proper JSON Array format (Modern)
      if (targetBatchIds && visibility === 'batch') formData.append('targetBatchIds', JSON.stringify(targetBatchIds.split(',').map(id => id.trim())));
      formData.append('courseIds', JSON.stringify(Array.from(courseIds)));
      formData.append('subjectIds', JSON.stringify(Array.from(subjectIds)));
      formData.append('topicIds', JSON.stringify(Array.from(topicIds)));
      formData.append('classIds', JSON.stringify(Array.from(classIds)));

      // Legacy Array fallback (for backward compatibility during deprecation phase)
      if (targetBatchIds && visibility === 'batch') targetBatchIds.split(',').forEach(id => formData.append('targetBatchIds[]', id.trim()));
      Array.from(courseIds).forEach(id => formData.append('courseIds[]', id));
      Array.from(subjectIds).forEach(id => formData.append('subjectIds[]', id));
      Array.from(topicIds).forEach(id => formData.append('topicIds[]', id));
      Array.from(classIds).forEach(id => formData.append('classIds[]', id));

      if (initialData) {
        // UPDATE 
        const updatePayload = {
          title, description, type, categoryId, displayGroup, visibility, status, isGeneral, offlineAvailable,
          isSecure: visibility === 'public' ? isSecure : true,
          author, language, readingTimeMins, pageCount, tags: tags.split(',').map((t: string)=>t.trim()),
          targetBatchIds: visibility === 'batch' && targetBatchIds ? targetBatchIds.split(',').map((s: string)=>s.trim()) : [],
          courseIds: Array.from(courseIds),
          subjectIds: Array.from(subjectIds),
          topicIds: Array.from(topicIds),
          classIds: Array.from(classIds)
        };
        await ResourceApi.updateResource(initialData.id, updatePayload);
        
        if (file) {
          const versionData = new FormData();
          versionData.append('file', file);
          await ResourceApi.uploadNewVersion(initialData.id, versionData);
        }
      } else {
        // CREATE
        if (uploadMode === 'file' && !file) throw new Error("Please select a file to upload.");
        if ((uploadMode === 'drive' || uploadMode === 'firebase') && !externalUrl) throw new Error("Please provide the URL.");
        
        if (uploadMode === 'file' && file) {
          formData.append('file', file);
        } else {
          formData.append('externalUrl', externalUrl);
          formData.append('provider', uploadMode === 'drive' ? 'google_drive' : 'firebase_asset');
        }

        await ResourceApi.createResource(formData);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save resource');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <div>
            <h2 className="text-xl font-bold text-white">
              {initialData ? 'Edit Learning Asset' : 'Upload Learning Asset'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">Enterprise Resource Management</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              
              {/* 1. Basic Info */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider border-b border-gray-800 pb-2">1. Core Identity</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Asset Title</label>
                    <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description / Instructor Notes</label>
                    <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Asset Type</label>
                      <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none">
                        {['PDF', 'DOC', 'PPT', 'IMAGE', 'ZIP', 'EXCEL', 'AUDIO', 'VIDEO_ATTACHMENT', 'LINK', 'HTML', 'CURRENT_AFFAIRS', 'QUESTION_BANK', 'COLLECTION'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                      <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none">
                        <option value="draft">Draft</option>
                        <option value="review">Needs Review</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Source */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider border-b border-gray-800 pb-2">2. Asset Source</h3>
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setUploadMode('file')} className={`flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 border transition-colors ${uploadMode === 'file' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                    Upload File
                  </button>
                  <button type="button" onClick={() => setUploadMode('drive')} className={`flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 border transition-colors ${uploadMode === 'drive' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                    Google Drive
                  </button>
                  <button type="button" onClick={() => setUploadMode('firebase')} className={`flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1 border transition-colors ${uploadMode === 'firebase' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-gray-950 border-gray-800 text-gray-400'}`}>
                    Existing DB
                  </button>
                </div>
                {uploadMode === 'file' ? (
                  <div className="border border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-950/50 text-center relative overflow-hidden group">
                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <UploadCloud className="w-8 h-8 text-gray-500 mb-2 group-hover:text-red-400 transition-colors" />
                    <p className="text-gray-300 text-sm font-medium">{file ? file.name : 'Click or drag file to upload'}</p>
                    <p className="text-gray-500 text-xs mt-1">Maximum file size 50MB</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Source URL</label>
                    <input value={externalUrl} onChange={e=>setExternalUrl(e.target.value)} type="url" placeholder="https://..." className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none" />
                  </div>
                )}
              </section>

              {/* 3. Extended Metadata */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider border-b border-gray-800 pb-2">3. Extended Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Author</label>
                    <input value={author} onChange={e=>setAuthor(e.target.value)} type="text" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Language</label>
                    <input value={language} onChange={e=>setLanguage(e.target.value)} type="text" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Page Count</label>
                    <input value={pageCount} onChange={e=>setPageCount(e.target.value)} type="number" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Tags (comma separated)</label>
                    <input value={tags} onChange={e=>setTags(e.target.value)} type="text" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-white text-sm focus:border-red-500 outline-none" />
                  </div>
                </div>
              </section>

            </div>

            {/* Right Column */}
            <div className="space-y-8">
              
              {/* 4. Target Audience & Display */}
              <section>
                <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider border-b border-gray-800 pb-2">4. Access Rules & Target Audience</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Target Audience *</label>
                    <select value={visibility} onChange={e=>setVisibility(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none">
                      <option value="public">All Users (Public)</option>
                      <option value="premium">Paid All (All Paid Students)</option>
                      <option value="batch">Paid Batch Wise (Specific Batches)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Group</label>
                    <select value={displayGroup} onChange={e=>setDisplayGroup(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none">
                      <option value="normal">Normal</option>
                      <option value="featured">Featured (Highlight)</option>
                      <option value="pinned">Pinned (Always Top)</option>
                    </select>
                  </div>
                </div>
                {visibility === 'batch' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Target Batches</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-3 bg-gray-950 border border-gray-800 rounded-lg">
                      {batches.length === 0 ? (
                        <p className="text-xs text-gray-500 col-span-2">No batches available.</p>
                      ) : (
                        batches.map(b => (
                          <label key={b.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors">
                            <input 
                              type="checkbox" 
                              checked={targetBatchIds.split(',').includes(b.id)}
                              onChange={(e) => {
                                const current = targetBatchIds ? targetBatchIds.split(',') : [];
                                if (e.target.checked) {
                                  setTargetBatchIds([...current, b.id].join(','));
                                } else {
                                  setTargetBatchIds(current.filter(id => id !== b.id).join(','));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-700 text-red-600 focus:ring-red-600 bg-gray-900 shrink-0" 
                            />
                            <span className="text-sm text-gray-300 truncate" title={b.name}>{b.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-3">
                  {visibility === 'public' && (
                    <div className="flex flex-col gap-3">
                      <span className="text-sm text-gray-300 font-medium mb-1">Security Settings (Public)</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="secure" checked={isSecure} onChange={() => setIsSecure(true)} className="w-4 h-4 text-red-600 bg-gray-900 border-gray-700 focus:ring-red-600" />
                        <span className="text-sm text-gray-300">Secure Mode (Blocks downloads, prints & applies watermark)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="secure" checked={!isSecure} onChange={() => setIsSecure(false)} className="w-4 h-4 text-red-600 bg-gray-900 border-gray-700 focus:ring-red-600" />
                        <span className="text-sm text-gray-300">Downloadable Mode (Standard Viewer, allows downloads)</span>
                      </label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="offline" checked={offlineAvailable} onChange={e=>setOfflineAvailable(e.target.checked)} className="w-4 h-4 rounded border-gray-700 text-red-600 focus:ring-red-600 bg-gray-900" />
                    <label htmlFor="offline" className="text-sm text-gray-300">Allow Mobile Offline Download</label>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-950 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition-colors font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}


