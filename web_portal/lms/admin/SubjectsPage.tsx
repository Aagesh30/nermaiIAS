import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BookOpen, Layers, Search, Filter } from 'lucide-react';
import { AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton, DeleteConfirm } from '../components/admin-ui';
import { CourseApi } from '../core/services';
import api from '../core/api';

export const SubjectsPage = ({ permission = 'edit_direct', executeEditOrApproval }: { permission?: string; executeEditOrApproval?: any }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', courseId: '', order: 0, status: 'active', defaultStaffId: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subjRes, coursesRes, staffRes] = await Promise.all([
        CourseApi.listAllSubjects(),
        CourseApi.listCourses(),
        api.get('/erp/staff')
      ]);
      setSubjects(subjRes.data?.data || []);
      setCourses(coursesRes.data?.data || []);
      const allStaff = staffRes.data?.data || staffRes.data || [];
      setTeachers(allStaff.filter((s: any) => s.role === 'teacher'));
    } catch (error) { console.error('Failed to fetch data', error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (subject: any = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name || '',
        description: subject.description || '',
        courseId: subject.courseId || '',
        order: subject.order || 0,
        status: subject.status || 'active',
        defaultStaffId: subject.defaultStaffId || ''
      });
    } else {
      setEditingSubject(null);
      setFormData({
        name: '',
        description: '',
        courseId: selectedCourseFilter !== 'all' ? selectedCourseFilter : (courses[0]?.id || ''),
        order: 0,
        status: 'active',
        defaultStaffId: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) { alert('Please select a course.'); return; }
    const saveAction = async () => {
      try {
        if (editingSubject) { await CourseApi.updateSubject(editingSubject.id, formData); }
        else { await CourseApi.createSubject(formData.courseId, formData); }
        setIsModalOpen(false);
        fetchData();
      } catch (error) { alert('Error saving subject.'); }
    };

    if (executeEditOrApproval) {
      const actionType = editingSubject ? 'edit' : 'create';
      executeEditOrApproval('lms_subjects', actionType, formData, saveAction, 'subjects', editingSubject?.id);
      setIsModalOpen(false);
    } else {
      await saveAction();
    }
  };

  const performDelete = async (id: string) => {
    setIsDeleting(true);
    const deleteAction = async () => {
      try { await CourseApi.deleteSubject(id); fetchData(); }
      catch { alert('Failed to delete subject'); }
      finally { setIsDeleting(false); setDeleteConfirm(null); }
    };

    if (executeEditOrApproval) {
      executeEditOrApproval('lms_subjects', 'delete', null, deleteAction, 'subjects', id);
      setIsDeleting(false);
      setDeleteConfirm(null);
    } else {
      await deleteAction();
    }
  };

  // Filter by Course and search query
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s: any) => {
      const matchesCourse = selectedCourseFilter === 'all' || s.courseId === selectedCourseFilter;
      const courseName = courses.find((c: any) => c.id === s.courseId)?.name || '';
      const matchesSearch = !searchQuery.trim() ||
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        courseName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCourse && matchesSearch;
    });
  }, [subjects, selectedCourseFilter, searchQuery, courses]);

  const columns = [
    {
      key: 'name',
      label: 'Subject Name',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">{val || 'Untitled Subject'}</div>
            {row.description ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">{row.description}</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: 'courseId',
      label: 'Linked Course',
      render: (val: string) => {
        const c = courses.find(item => item.id === val);
        const name = c?.name || c?.title || val || 'Unassigned';
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80] border border-[#8B0000]/20">
            <BookOpen className="w-3 h-3" />
            {name}
          </span>
        );
      }
    },
    {
      key: 'defaultStaffId',
      label: 'Assigned Teacher',
      render: (val: string) => {
        const teacher = teachers.find(t => t.id === val);
        const name = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned';
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${teacher ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-transparent' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-100 dark:border-transparent'}`}>
            {name}
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Subjects</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80]">
              {subjects.length} Total
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage subjects structured inside courses.</p>
        </div>
        {permission !== 'view' && (
          <AdminButton onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" /> Create Subject
          </AdminButton>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-[#1a1a2e] p-4 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center flex-1">
          {/* Course Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
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

          {/* Subject Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] font-medium"
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-end md:self-center">
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </div>
      </div>

      {/* Subjects Table */}
      <AdminTable columns={columns} data={filteredSubjects} isLoading={isLoading} onEdit={permission !== 'view' ? handleOpenModal : undefined} onDelete={permission !== 'view' ? (s) => setDeleteConfirm(s.id) : undefined} />

      {/* Create / Edit Modal */}
      <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubject ? 'Edit Subject' : 'Create New Subject'}>
        <form onSubmit={handleSave} className="space-y-4">
          <AdminSelect
            label="Belongs to Course *"
            value={formData.courseId}
            onChange={(e) => setFormData({...formData, courseId: e.target.value})}
            required
            options={[
              { value: '', label: 'Select a course...' },
              ...courses.map(c => ({ value: c.id || '', label: c.name || c.title || '' }))
            ]}
          />
          <AdminSelect
            label="Assigned Teacher"
            value={formData.defaultStaffId}
            onChange={(e) => setFormData({...formData, defaultStaffId: e.target.value})}
            options={[
              { value: '', label: 'No Teacher Assigned (None)' },
              ...teachers.map(t => ({ value: t.id || '', label: `${t.firstName} ${t.lastName}` }))
            ]}
          />
          <AdminInput label="Subject Name *" placeholder="e.g. Maths, General Studies, History" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 min-h-[90px] text-sm font-medium shadow-sm transition-all"
              placeholder="Subject summary and modules..."
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
            <AdminButton type="submit">Save Subject</AdminButton>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirm isOpen={!!deleteConfirm} title="Delete Subject" message="Are you sure you want to delete this subject? This action cannot be undone." isDeleting={isDeleting} onConfirm={() => deleteConfirm && performDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
};


