import React, { useEffect, useState } from 'react';
import { ResourceApi } from '../core/services';
import { FileText, Folder, ChevronDown, ChevronRight, Search, File, FileArchive, FileSpreadsheet, ImageIcon, Headphones, Link as LinkIcon, DownloadCloud, Star, Pin } from 'lucide-react';

const ResourceViewer = React.lazy(() => import('./ResourceViewer').then(m => ({ default: m.ResourceViewer })));

interface CourseResourcesProps {
  courseId: string;
}

export const CourseResources: React.FC<CourseResourcesProps> = ({ courseId }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHierarchy = async () => {
      setLoading(true);
      try {
        const response = await ResourceApi.getCourseHierarchy(courseId);
        const fetchedGroups = response.data.data.groups || [];
        setGroups(fetchedGroups);
        
        // Initialize expanded state based on API response
        const initExpanded: Record<string, boolean> = {};
        fetchedGroups.forEach((g: any) => {
          initExpanded[g.title] = g.expanded;
        });
        setExpandedGroups(initExpanded);
      } catch (err) {
        console.error('Failed to load course resources', err);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) {
      fetchHierarchy();
    }
  }, [courseId]);

  const handleOpenResource = (resource: any) => {
    setSelectedResourceId(resource.id);
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="w-8 h-8 text-red-500" />;
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
      <div className="mt-8 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Loading course resources...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Unified Search */}
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text" 
          placeholder="Search across all resources..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-4">
        {groups.map((group: any) => {
          // Client side search filtering
          const filteredResources = group.resources?.filter((r: any) => 
            r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            r.description?.toLowerCase().includes(searchQuery.toLowerCase())
          ) || [];

          // Don't hide the group entirely if searching, just show empty. 
          // If not searching and count is 0, show it as collapsed.
          const isExpanded = searchQuery ? filteredResources.length > 0 : expandedGroups[group.title];

          return (
            <div key={group.title} className="bg-surface/40 border border-white/5 rounded-2xl overflow-hidden">
              <button 
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className={`w-5 h-5 ${group.count > 0 ? 'text-primary' : 'text-gray-600'}`} />
                  <h3 className={`text-lg font-bold ${group.count > 0 ? 'text-white' : 'text-gray-500'}`}>
                    {group.title} <span className="text-sm font-normal text-gray-500 ml-2">({filteredResources.length})</span>
                  </h3>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
              </button>

              {isExpanded && (
                <div className="p-5 pt-0 border-t border-white/5">
                  {filteredResources.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No resources found in this group.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {filteredResources.map((res: any) => (
                        <button
                          key={res.id}
                          onClick={() => handleOpenResource(res)}
                          className="flex items-start p-4 bg-surface/50 hover:bg-surfaceHighlight border border-white/5 hover:border-accent/30 rounded-xl transition-all group text-left relative overflow-hidden"
                        >
                          {/* Badges Overlay */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            {res.isPinned && <Pin className="w-3 h-3 text-accent" />}
                            {res.isFeatured && <Star className="w-3 h-3 text-primary" />}
                            {res.offlineAvailable && <DownloadCloud className="w-3 h-3 text-blue-400" />}
                          </div>

                          <div className="mr-4 shrink-0 mt-1 relative z-10">
                            {getResourceIcon(res.type)}
                          </div>
                          
                          <div className="relative z-10 flex-1 min-w-0">
                            <p className="text-slate-200 font-bold group-hover:text-white transition-colors truncate pr-8">{res.title}</p>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                              <span className="uppercase tracking-wider font-semibold text-gray-400">{res.type}</span>
                              
                              {res.pageCount && (
                                <><span>•</span><span>{res.pageCount} Pages</span></>
                              )}
                              
                              {res.fileSize > 0 && (
                                <><span>•</span><span>{formatSize(res.fileSize)}</span></>
                              )}
                              
                              {res.readingTimeMins && (
                                <><span>•</span><span>{res.readingTimeMins} min read</span></>
                              )}
                            </div>
                            
                            {res.description && (
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{res.description}</p>
                            )}
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

      {selectedResourceId && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-50 bg-[#0f1219]/90 backdrop-blur-xl p-8 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ResourceViewer
            resourceId={selectedResourceId}
            onClose={() => setSelectedResourceId(null)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

