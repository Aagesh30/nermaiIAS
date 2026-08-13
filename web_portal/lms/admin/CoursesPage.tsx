import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BookOpen, Search, Sparkles } from 'lucide-react';
import { AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton, DeleteConfirm } from '../components/admin-ui';
import { CourseApi } from '../core/services';

export const CoursesPage = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({ name: '', description: '', visibility: 'private', price: 0, tags: '' });

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await CourseApi.listCourses();
      setCourses(res.data?.data || []);
    } catch (error) { console.error('Failed to fetch courses', error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = (course: any) => setDeleteConfirm(course.id);

  const performDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await CourseApi.deleteCourse(id);
      fetchCourses();
    } catch (error) { alert('Failed to delete course'); }
    finally { setIsDeleting(false); setDeleteConfirm(null); }
  };

  const handleOpenModal = (course: any = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({ name: course.name || '', description: course.description || '', visibility: course.visibility || 'private', price: course.price || 0, tags: course.tags ? course.tags.join(', ') : '' });
    } else {
      setEditingCourse(null);
      setFormData({ name: '', description: '', visibility: 'private', price: 0, tags: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean), price: Number(formData.price) };
      if (editingCourse) { await CourseApi.updateCourse(editingCourse.id, payload); }
      else { await CourseApi.createCourse(payload); }
      setIsModalOpen(false);
      fetchCourses();
    } catch (error) { alert('Error saving course. Check console.'); }
  };

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.tags || []).some((t: string) => t.toLowerCase().includes(q))
    );
  }, [courses, searchQuery]);

  const columns = [
    {
      key: 'name',
      label: 'Course Name',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#8B0000]/10 dark:bg-[#8B0000]/30 text-[#8B0000] dark:text-[#ff6b6b] flex items-center justify-center font-bold text-sm shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">{val || 'Untitled Course'}</div>
            {row.description ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">{row.description}</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: (val: string) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${(val || 'private') === 'public' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-transparent' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-transparent'}`}>
          {val || 'private'}
        </span>
      )
    },
    {
      key: 'price',
      label: 'Price',
      render: (val: number) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {val > 0 ? `₹${Number(val).toLocaleString()}` : <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free</span>}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Courses</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80]">
              {courses.length} Total
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage master academy courses, offerings, and pricing.</p>
        </div>
        <AdminButton onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" /> Create Course
        </AdminButton>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#1a1a2e] p-4 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 transition-all font-medium"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Showing {filteredCourses.length} of {courses.length} courses
        </div>
      </div>

      {/* Courses Table */}
      <AdminTable columns={columns} data={filteredCourses} isLoading={isLoading} onEdit={handleOpenModal} onDelete={handleDelete} />

      {/* Create / Edit Modal */}
      <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCourse ? 'Edit Course' : 'Create New Course'}>
        <form onSubmit={handleSave} className="space-y-4">
          <AdminInput label="Course Name" placeholder="e.g. UDC / LDC / TNPSC Group 2" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 min-h-[90px] text-sm font-medium shadow-sm transition-all"
              placeholder="Brief overview of course curriculum..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminSelect label="Visibility" value={formData.visibility} onChange={(e) => setFormData({...formData, visibility: e.target.value})} options={[{ value: 'private', label: 'Private (Enrolled only)' }, { value: 'public', label: 'Public (Open catalog)' }, { value: 'restricted', label: 'Restricted' }]} />
            <AdminInput label="Price (₹)" type="number" placeholder="0" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
          </div>
          <AdminInput label="Tags (comma separated)" placeholder="e.g. prelims, mains, general studies" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} />
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10">
            <AdminButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Save Course</AdminButton>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirm isOpen={!!deleteConfirm} title="Delete Course" message="Are you sure you want to delete this course? This action cannot be undone." isDeleting={isDeleting} onConfirm={() => deleteConfirm && performDelete(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
};


