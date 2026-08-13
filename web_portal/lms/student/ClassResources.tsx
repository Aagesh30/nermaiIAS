import React, { useEffect, useState } from 'react';
import { ResourceApi } from '../core/services';
import { FileText, Folder, ChevronDown, ChevronRight, File, FileArchive, FileSpreadsheet, ImageIcon, Headphones, Link as LinkIcon, DownloadCloud, Star, Pin } from 'lucide-react';

const ResourceViewer = React.lazy(() => import('./ResourceViewer').then(m => ({ default: m.ResourceViewer })));

interface ClassResourcesProps {
  classId: string;
  courseId: string;
}

export const ClassResources: React.FC<ClassResourcesProps> = ({ classId, courseId }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const [selectedResource, setSelectedResource] = useState<any | null>(null);


  useEffect(() => {
    const fetchHierarchy = async () => {
      setLoading(true);
      try {
        const response = await ResourceApi.getCourseHierarchy(courseId);
        const fetchedGroups = response.data.data.groups || [];
        setGroups(fetchedGroups);
        
        const initExpanded: Record<string, boolean> = {};
        fetchedGroups.forEach((g: any) => {
          initExpanded[g.title] = g.expanded;
        });
        setExpandedGroups(initExpanded);
      } catch (err) {
        console.error('Failed to load inherited course resources', err);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) {
      fetchHierarchy();
    }
  }, [courseId]);

  const handleOpenResource = (resource: any) => {
    setSelectedResource(resource);
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="w-8 h-8 text-emerald-500" />;
      case 'IMAGE': return <ImageIcon className="w-8 h-8 text-blue-500" />;
      case 'ZIP': return <FileArchive className="w-8 h-8 text-amber-500" />;
      case 'EXCEL': return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'AUDIO': return <Headphones className="w-8 h-8 text-purple-500" />;
      case 'LINK': return <LinkIcon className="w-8 h-8 text-cyan-500" />;
      default: return <File className="w-8 h-8 text-slate-500" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + ' KB';
    return mb.toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="mt-8 p-6 bg-[#1A0A0A]/40 border border-white/5 rounded-3xl animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 w-full bg-white/5 rounded-xl"></div>
          <div className="h-12 w-full bg-white/5 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const hasAnyResources = groups.some(g => g.count > 0);
  if (!hasAnyResources) {
    return null;
  }

  return (
    <div className="mt-8 bg-[#1A0A0A]/40 border border-white/5 rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
        <FileText className="w-6 h-6 text-emerald-500" />
        Contextual Resources
      </h3>
      
      <div className="space-y-4">
        {groups.map((group: any) => {
          const isExpanded = expandedGroups[group.title];

          return (
            <div key={group.title} className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
              <button 
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className={`w-5 h-5 ${group.count > 0 ? 'text-amber-500' : 'text-gray-600'}`} />
                  <h3 className={`text-base font-bold ${group.count > 0 ? 'text-white' : 'text-gray-500'}`}>
                    {group.title} <span className="text-sm font-normal text-gray-500 ml-2">({group.resources?.length || 0})</span>
                  </h3>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 border-t border-white/5">
                  {group.resources?.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No resources found in this group.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {group.resources?.map((res: any) => (
                        <button
                          key={res.id}
                          onClick={() => handleOpenResource(res)}
                          className="flex items-start p-3 bg-[#130707] hover:bg-[#1C0A0A] border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all group text-left relative overflow-hidden"
                        >
                          <div className="absolute top-2 right-2 flex gap-1">
                            {res.isPinned && <Pin className="w-3 h-3 text-red-400" />}
                            {res.isFeatured && <Star className="w-3 h-3 text-amber-400" />}
                            {res.offlineAvailable && <DownloadCloud className="w-3 h-3 text-blue-400" />}
                          </div>

                          <div className="mr-3 shrink-0 mt-1 relative z-10">
                            {getResourceIcon(res.type)}
                          </div>
                          
                          <div className="relative z-10 flex-1 min-w-0">
                            <p className="text-slate-200 font-bold text-sm group-hover:text-white transition-colors truncate pr-8">{res.title}</p>
                            
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-gray-500">
                              <span className="uppercase tracking-wider font-semibold text-gray-400">{res.type}</span>
                              
                              {res.pageCount && (
                                <><span>•</span><span>{res.pageCount} Pages</span></>
                              )}
                              
                              {res.fileSize > 0 && (
                                <><span>•</span><span>{formatSize(res.fileSize)}</span></>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedResource && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-50 bg-[#0f1219]/90 backdrop-blur-xl p-8 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#8B0000] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ResourceViewer
            resourceId={selectedResource.id}
            onClose={() => setSelectedResource(null)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

