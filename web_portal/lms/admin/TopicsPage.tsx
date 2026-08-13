import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BookOpen, Layers, FileText, Search, Filter, ArrowRight } from 'lucide-react';
import { AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton, DeleteConfirm } from '../components/admin-ui';
import { CourseApi } from '../core/services';

export const TopicsPage = () => {
  const [topics, setTopics] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal form data
  const [modalCourseId, setModalCourseId] = useState<string>('');
  const [formData, setFormData] = useState({ name: '', description: '', subjectId: '', order: 0, status: 'active' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [topicRes, subjRes, courseRes] = await Promise.all([
        CourseApi.listAllTopics(),
        CourseApi.listAllSubjects(),
        CourseApi.listCourses()
      ]);
      setTopics(topicRes.data?.data || []);
      setSubjects(subjRes.data?.data || []);
      setCourses(courseRes.data?.data || []);
    } catch (error) { console.error('Failed to fetch data', error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // When Course filter changes, reset Subject filter if the subject doesn't belong to the course
  const handleCourseFilterChange = (courseId: string) => {
    setSelectedCourseFilter(courseId);
    if (courseId !== 'all') {
      const subjectStillValid = subjects.some(s => s.id === selectedSubjectFilter && s.courseId === courseId);
      if (!subjectStillValid) setSelectedSubjectFilter('all');
    }
  };

  // Subjects available under currently selected course filter
  const availableFilterSubjects = useMemo(() => {
    if (selectedCourseFilter === 'all') return subjects;
    return subjects.filter(s => s.courseId === selectedCourseFilter);
  }, [subjects, selectedCourseFilter]);

  // Subjects available in the modal depending on modalCourseId
  const availableModalSubjects = useMemo(() => {
    if (!modalCourseId) return subjects;
    return subjects.filter(s => s.courseId === modalCourseId);
  }, [subjects, modalCourseId]);

  const handleOpenModal = (topic: any = null) => {
    if (topic) {
      setEditingTopic(topic);
      const subject = subjects.find(s => s.id === topic.subjectId);
      setModalCourseId(subject?.courseId || '');
      setFormData({
        name: topic.name || '',
        description: topic.description || '',
        subjectId: topic.subjectId || '',
        order: topic.order || 0,
        status: topic.status || 'active'
      });
    } else {
      setEditingTopic(null);
      const defaultCourse = selectedCourseFilter !== 'all' ? selectedCourseFilter : (courses[0]?.id || '');
      setModalCourseId(defaultCourse);
      const defaultSubjects = subjects.filter(s => s.courseId === defaultCourse);
      const defaultSubjectId = selectedSubjectFilter !== 'all'
        ? selectedSubjectFilter
        : (defaultSubjects[0]?.id || subjects[0]?.id || '');
      setFormData({
        name: '',
        description: '',
        subjectId: defaultSubjectId,
        order: 0,
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId) { alert('Please select a subject.'); return; }
    try {
      if (editingTopic) { await CourseApi.updateTopic(editingTopic.id, formData); }
      else { await CourseApi.createTopic(formData.subjectId, formData); }
      setIsModalOpen(false);
      fetchData();
    } catch (error) { alert('Error saving topic.'); }
  };

  const performDelete = async (id: string) => {
    setIsDeleting(true);
    try { await CourseApi.deleteTopic(id); fetchData(); }
    catch { alert('Failed to delete topic'); }
    finally { setIsDeleting(false); setDeleteConfirm(null); }
  };

  // Filter topics by course -> subject -> search query
  const filteredTopics = useMemo(() => {
    return topics.filter((t: any) => {
      const subject = subjects.find(s => s.id === t.subjectId);
      const courseId = subject?.courseId || '';
      const course = courses.find(c => c.id === courseId);

      const matchesCourse = selectedCourseFilter === 'all' || courseId === selectedCourseFilter;
      const matchesSubject = selectedSubjectFilter === 'all' || t.subjectId === selectedSubjectFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (t.name || '').toLowerCase().includes(q) ||
        (subject?.name || '').toLowerCase().includes(q) ||
        (course?.name || '').toLowerCase().includes(q);

      return matchesCourse && matchesSubject && matchesSearch;
    });
  }, [topics, subjects, courses, selectedCourseFilter, selectedSubjectFilter, searchQuery]);

  const columns = [
    {
      key: 'name',
      label: 'Topic Name',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">{val || 'Untitled Topic'}</div>
            {row.description ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">{row.description}</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: 'subjectId',
      label: 'Subject',
      render: (val: string) => {
        const s = subjects.find(item => item.id === val);
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
            <Layers className="w-3 h-3" />
            {s?.name || val || 'Unassigned'}
          </span>
        );
      }
    },
    {
      key: 'course',
      label: 'Linked Course',
      render: (_: any, row: any) => {
        const s = subjects.find(item => item.id === row.subjectId);
        const c = courses.find(item => item.id === s?.courseId);
        const courseName = c?.name || c?.title || '—';
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80] border border-[#8B0000]/20">
            <BookOpen className="w-3 h-3" />
            {courseName}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${(val || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-transparent'}`}>
          {(val || 'active').toUpperCase()}
        </span>
      )
    },
    {
      key: 'order',
      label: 'Order',
      render: (val: any) => <span className="font-semibold text-gray-600 dark:text-gray-300">#{val ?? 0}</span>
    }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Topics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80]">
              {topics.length} Total
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage granular topics structured within subjects and master courses.</p>
        </div>
        <AdminButton onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" /> Create Topic
        </AdminButton>
      </div>

      {/* Cascading Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white dark:bg-[#1a1a2e] p-4 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 flex-wrap">
          {/* 1. Filter by Course */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course:</span>
            <select
              value={selectedCourseFilter}
              onChange={(e) => handleCourseFilterChange(e.target.value)}
              className="px-3.5 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#8B0000] cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Subject (Cascading) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3.5 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#8B0000] cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Subjects ({availableFilterSubjects.length})</option>
              {availableFilterSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] font-medium"
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-end lg:self-center">
          Showing {filteredTopics.length} of {topics.length} topics
        </div>
      </div>

      {/* Topics Table with Course & Subject Linkage */}
      <AdminTable columns={columns} data={filteredTopics} isLoading={isLoading} onEdit={handleOpenModal} onDelete={(t) => setDeleteConfirm(t.id)} />

      {/* Create / Edit Modal */}
      <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTopic ? 'Edit Topic' : 'Create New Topic'}>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Step 1: Select Course */}
          <AdminSelect
            label="1. Select Master Course"
            value={modalCourseId}
            onChange={(e) => {
              const newCId = e.target.value;
              setModalCourseId(newCId);
              const subs = subjects.filter(s => s.courseId === newCId);
              if (subs.length > 0) {
                setFormData({ ...formData, subjectId: subs[0].id });
              } else {
                setFormData({ ...formData, subjectId: '' });
              }
            }}
            options={[
              { value: '', label: 'Select a course...' },
              ...courses.map(c => ({ value: c.id || '', label: c.name || c.title || '' }))
            ]}
          />

          {/* Step 2: Select Subject under this Course */}
          <AdminSelect
            label="2. Belongs to Subject *"
            value={formData.subjectId}
            onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
            required
            options={[
              { value: '', label: availableModalSubjects.length === 0 ? 'No subjects found for this course' : 'Select a subject...' },
              ...availableModalSubjects.map(s => ({
                value: s.id || '',
                label: `${s.name} ${modalCourseId ? '' : `(${courses.find(c => c.id === s.courseId)?.name || 'General'})`}`
              }))
            ]}
          />

          {/* Step 3: Topic Details */}
          <AdminInput label="3. Topic Name *" placeholder="e.g. Basic Arithmetic, World War History" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 min-h-[90px] text-sm font-medium shadow-sm transition-all"
              placeholder="Topic syllabus and learning objectives..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminSelect label="Status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <AdminInput label="Display Order" type="number" placeholder="0" value={formData.order} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})} />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10">
            <AdminButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Topic</AdminButton>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirm isOpen={!!deleteConfirm} title="Delete Topic" message="Are you sure you want to delete this topic? This cannot be undone." isDeleting={isDeleting} onConfirm={() => deleteConfirm && performDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
};


