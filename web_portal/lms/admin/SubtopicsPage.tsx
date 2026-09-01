import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BookOpen, Layers, FileText, Search, Shield, User, ArrowRight } from 'lucide-react';
import { AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton, DeleteConfirm } from '../components/admin-ui';
import { CourseApi } from '../core/services';
import api from '../core/api';

export const SubtopicsPage = ({ permission = 'edit_direct', executeEditOrApproval }: { permission?: string; executeEditOrApproval?: any }) => {
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Filter States
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Form States
  const [modalCourseId, setModalCourseId] = useState<string>('');
  const [modalSubjectId, setModalSubjectId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topicId: '',
    order: 0,
    defaultStaffId: '', // Direct Teacher Assignment Override
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subtopicRes, topicRes, subjRes, courseRes, staffRes] = await Promise.all([
        CourseApi.listAllSubtopics(),
        CourseApi.listAllTopics(),
        CourseApi.listAllSubjects(),
        CourseApi.listCourses(),
        api.get('/erp/staff')
      ]);

      setSubtopics(subtopicRes.data?.data || []);
      setTopics(topicRes.data?.data || []);
      setSubjects(subjRes.data?.data || []);
      setCourses(courseRes.data?.data || []);

      const allStaff = staffRes.data?.data || staffRes.data || [];
      const teacherStaff = allStaff.filter((s: any) => s.role === 'teacher');
      setTeachers(teacherStaff);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Cascading Handlers
  const handleCourseFilterChange = (courseId: string) => {
    setSelectedCourseFilter(courseId);
    setSelectedSubjectFilter('all');
    setSelectedTopicFilter('all');
  };

  const handleSubjectFilterChange = (subjectId: string) => {
    setSelectedSubjectFilter(subjectId);
    setSelectedTopicFilter('all');
  };

  // Filter lists based on selections
  const availableFilterSubjects = useMemo(() => {
    if (selectedCourseFilter === 'all') return subjects;
    return subjects.filter(s => s.courseId === selectedCourseFilter);
  }, [subjects, selectedCourseFilter]);

  const availableFilterTopics = useMemo(() => {
    if (selectedSubjectFilter === 'all') {
      if (selectedCourseFilter === 'all') return topics;
      // Get topics belonging to all subjects of selected course
      const courseSubjIds = subjects.filter(s => s.courseId === selectedCourseFilter).map(s => s.id);
      return topics.filter(t => courseSubjIds.includes(t.subjectId));
    }
    return topics.filter(t => t.subjectId === selectedSubjectFilter);
  }, [topics, subjects, selectedCourseFilter, selectedSubjectFilter]);

  // Modal Cascading Lists
  const availableModalSubjects = useMemo(() => {
    if (!modalCourseId) return [];
    return subjects.filter(s => s.courseId === modalCourseId);
  }, [subjects, modalCourseId]);

  const availableModalTopics = useMemo(() => {
    if (!modalSubjectId) return [];
    return topics.filter(t => t.subjectId === modalSubjectId);
  }, [topics, modalSubjectId]);

  const handleOpenModal = (subtopic: any = null) => {
    if (subtopic) {
      setEditingSubtopic(subtopic);
      const topic = topics.find(t => t.id === subtopic.topicId);
      const subject = subjects.find(s => s.id === topic?.subjectId);
      
      setModalCourseId(subject?.courseId || '');
      setModalSubjectId(topic?.subjectId || '');
      setFormData({
        name: subtopic.name || '',
        description: subtopic.description || '',
        topicId: subtopic.topicId || '',
        order: subtopic.order || 0,
        defaultStaffId: subtopic.defaultStaffId || '',
      });
    } else {
      setEditingSubtopic(null);
      
      // Determine default courseId — prefer active filter, then first loaded course
      // Guard: only use courses[0] when courses array is actually populated
      let defaultCourse = '';
      if (selectedCourseFilter !== 'all') {
        defaultCourse = selectedCourseFilter;
      } else if (courses.length > 0) {
        defaultCourse = courses[0].id || '';
      }
      // else: leave empty — user must pick a course in the modal
      setModalCourseId(defaultCourse);

      let defaultSubjectId = '';
      if (defaultCourse) {
        const defaultSubjects = subjects.filter(s => s.courseId === defaultCourse);
        if (selectedSubjectFilter !== 'all' && defaultSubjects.some(s => s.id === selectedSubjectFilter)) {
          defaultSubjectId = selectedSubjectFilter;
        } else if (defaultSubjects.length > 0) {
          defaultSubjectId = defaultSubjects[0].id || '';
        }
      }
      setModalSubjectId(defaultSubjectId);

      let defaultTopicId = '';
      if (defaultSubjectId) {
        const defaultTopics = topics.filter(t => t.subjectId === defaultSubjectId);
        if (selectedTopicFilter !== 'all' && defaultTopics.some(t => t.id === selectedTopicFilter)) {
          defaultTopicId = selectedTopicFilter;
        } else if (defaultTopics.length > 0) {
          defaultTopicId = defaultTopics[0].id || '';
        }
      }

      setFormData({
        name: '',
        description: '',
        topicId: defaultTopicId,
        order: 0,
        defaultStaffId: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topicId) {
      alert('Please select a topic.');
      return;
    }
    const saveAction = async () => {
      try {
        if (editingSubtopic) {
          await CourseApi.updateSubtopic(editingSubtopic.id, formData);
        } else {
          await CourseApi.createSubtopic(formData.topicId, formData);
        }
        setIsModalOpen(false);
        fetchData();
      } catch (error) {
        alert('Error saving subtopic.');
      }
    };

    if (executeEditOrApproval) {
      const actionType = editingSubtopic ? 'edit' : 'create';
      executeEditOrApproval('lms_subtopics', actionType, formData, saveAction, 'subtopics', editingSubtopic?.id);
      setIsModalOpen(false);
    } else {
      await saveAction();
    }
  };

  const performDelete = async (id: string) => {
    setIsDeleting(true);
    const deleteAction = async () => {
      try {
        await CourseApi.deleteSubtopic(id);
        fetchData();
      } catch {
        alert('Failed to delete subtopic');
      } finally {
        setIsDeleting(false);
        setDeleteConfirm(null);
      }
    };

    if (executeEditOrApproval) {
      executeEditOrApproval('lms_subtopics', 'delete', null, deleteAction, 'subtopics', id);
      setIsDeleting(false);
      setDeleteConfirm(null);
    } else {
      await deleteAction();
    }
  };

  // Filter Subtopics
  const filteredSubtopics = useMemo(() => {
    return subtopics.filter((sub: any) => {
      const topic = topics.find(t => t.id === sub.topicId);
      const subject = subjects.find(s => s.id === topic?.subjectId);
      const courseId = subject?.courseId || '';
      const course = courses.find(c => c.id === courseId);

      const matchesCourse = selectedCourseFilter === 'all' || courseId === selectedCourseFilter;
      const matchesSubject = selectedSubjectFilter === 'all' || topic?.subjectId === selectedSubjectFilter;
      const matchesTopic = selectedTopicFilter === 'all' || sub.topicId === selectedTopicFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (sub.name || '').toLowerCase().includes(q) ||
        (topic?.name || '').toLowerCase().includes(q) ||
        (subject?.name || '').toLowerCase().includes(q) ||
        (course?.name || '').toLowerCase().includes(q);

      return matchesCourse && matchesSubject && matchesTopic && matchesSearch;
    });
  }, [subtopics, topics, subjects, courses, selectedCourseFilter, selectedSubjectFilter, selectedTopicFilter, searchQuery]);

  const columns = [
    {
      key: 'name',
      label: 'Subtopic Name',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">{val || 'Untitled Subtopic'}</div>
            {row.description ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">{row.description}</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: 'topic',
      label: 'Parent Topic',
      render: (_: any, row: any) => {
        const topic = topics.find(t => t.id === row.topicId);
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
            {topic?.name || row.topicId || 'Unknown'}
          </span>
        );
      }
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (_: any, row: any) => {
        const topic = topics.find(t => t.id === row.topicId);
        const s = subjects.find(item => item.id === topic?.subjectId);
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
            <Layers className="w-3 h-3" />
            {s?.name || '—'}
          </span>
        );
      }
    },
    {
      key: 'teacher',
      label: 'Assigned Teacher',
      render: (_: any, row: any) => {
        const topic = topics.find(t => t.id === row.topicId);
        const subject = subjects.find(s => s.id === topic?.subjectId);
        
        const directStaffId = row.defaultStaffId;
        const subjectStaffId = subject?.defaultStaffId;

        if (directStaffId) {
          const teacher = teachers.find(t => t.id === directStaffId);
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold">
              <Shield className="w-3 h-3 text-emerald-500" />
              {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Direct Override'}
            </span>
          );
        }

        if (subjectStaffId) {
          const teacher = teachers.find(t => t.id === subjectStaffId);
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-medium">
              <User className="w-3 h-3 text-gray-500" />
              {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Subject Default'} (Inherited)
            </span>
          );
        }

        return <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold italic">No Teacher Assigned</span>;
      }
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Subtopics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80]">
              {subtopics.length} Total
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage subtopics belonging to topics. Teachers are inherited automatically from subjects, or overridden here.</p>
        </div>
        {permission !== 'view' && (
          <AdminButton onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Create Subtopic
          </AdminButton>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white dark:bg-[#1a1a2e] p-4 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 flex-wrap">
          {/* Course Select */}
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

          {/* Subject Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => handleSubjectFilterChange(e.target.value)}
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

          {/* Topic Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Topic:</span>
            <select
              value={selectedTopicFilter}
              onChange={(e) => setSelectedTopicFilter(e.target.value)}
              className="px-3.5 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#8B0000] cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Topics ({availableFilterTopics.length})</option>
              {availableFilterTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subtopics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] font-medium"
            />
          </div>
        </div>
        
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-end lg:self-center">
          Showing {filteredSubtopics.length} of {subtopics.length} subtopics
        </div>
      </div>

      {/* Subtopics Table */}
      <AdminTable columns={columns} data={filteredSubtopics} isLoading={isLoading} onEdit={permission !== 'view' ? handleOpenModal : undefined} onDelete={permission !== 'view' ? (sub) => setDeleteConfirm(sub.id) : undefined} />

      {/* Create / Edit Modal */}
      <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubtopic ? 'Edit Subtopic' : 'Create New Subtopic'}>
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
                setModalSubjectId(subs[0].id);
                const tops = topics.filter(t => t.subjectId === subs[0].id);
                setFormData({ ...formData, topicId: tops[0]?.id || '' });
              } else {
                setModalSubjectId('');
                setFormData({ ...formData, topicId: '' });
              }
            }}
            options={[
              { value: '', label: 'Select a course...' },
              ...courses.map(c => ({ value: c.id || '', label: c.name || c.title || '' }))
            ]}
          />

          {/* Step 2: Select Subject under this Course */}
          <AdminSelect
            label="2. Select Subject"
            value={modalSubjectId}
            onChange={(e) => {
              const newSId = e.target.value;
              setModalSubjectId(newSId);
              const tops = topics.filter(t => t.subjectId === newSId);
              setFormData({ ...formData, topicId: tops[0]?.id || '' });
            }}
            options={[
              { value: '', label: availableModalSubjects.length === 0 ? 'No subjects found' : 'Select a subject...' },
              ...availableModalSubjects.map(s => ({ value: s.id || '', label: s.name }))
            ]}
          />

          {/* Step 3: Select Topic under this Subject */}
          <AdminSelect
            label="3. Belongs to Topic *"
            value={formData.topicId}
            onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
            required
            options={[
              { value: '', label: availableModalTopics.length === 0 ? 'No topics found' : 'Select a topic...' },
              ...availableModalTopics.map(t => ({ value: t.id || '', label: t.name }))
            ]}
          />

          {/* Step 4: Subtopic Name */}
          <AdminInput label="4. Subtopic Name *" placeholder="e.g. Percentage, Profit & Loss" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />

          {/* Step 5: Description */}
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 min-h-[90px] text-sm font-medium shadow-sm transition-all"
              placeholder="Subtopic learning goals or sub-syllabus..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Step 6: Direct Assigned Teacher Override */}
          <AdminSelect
            label="5. Assign Teacher (Optional - overrides Subject Teacher)"
            value={formData.defaultStaffId}
            onChange={(e) => setFormData({ ...formData, defaultStaffId: e.target.value })}
            options={[
              { value: '', label: 'Inherit Teacher from Subject default' },
              ...teachers.map(t => ({ value: t.id || '', label: `${t.firstName} ${t.lastName}` }))
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <AdminInput label="Display Order" type="number" placeholder="0" value={formData.order} onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })} />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10">
            <AdminButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Subtopic</AdminButton>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirm isOpen={!!deleteConfirm} title="Delete Subtopic" message="Are you sure you want to delete this subtopic? This cannot be undone." isDeleting={isDeleting} onConfirm={() => deleteConfirm && performDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
};
