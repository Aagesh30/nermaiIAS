import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Users, Search, Mail, Phone, Shield } from 'lucide-react';
import { AdminTable, AdminModal, AdminInput, AdminButton, DeleteConfirm } from '../components/admin-ui';
import api from '../core/api';

export const TeachersPage = ({ permission = 'edit_direct', executeEditOrApproval }: { permission?: string; executeEditOrApproval?: any }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    loginUsername: '',
    loginPassword: '',
  });

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/erp/staff');
      const allStaff = res.data?.data || res.data || [];
      const teacherStaff = allStaff.filter((s: any) => s.role === 'teacher');
      setTeachers(teacherStaff);
    } catch (error) {
      console.error('Failed to fetch teachers', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenModal = (teacher: any = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        loginUsername: teacher.loginUsername || '',
        loginPassword: '', // Don't prefill password
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        loginUsername: '',
        loginPassword: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      alert('First name and last name are required');
      return;
    }
    if (!editingTeacher && (!formData.loginUsername || !formData.loginPassword)) {
      alert('Username and password are required for new teachers');
      return;
    }

    const payload = {
      ...formData,
      designation: 'Teacher',
      department: 'Academics',
      role: 'teacher',
    };

    const saveAction = async () => {
      try {
        if (editingTeacher) {
          await api.put(`/erp/staff/${editingTeacher.id}`, payload);
        } else {
          await api.post('/erp/staff', payload);
        }
        setIsModalOpen(false);
        fetchTeachers();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Error saving teacher account');
      }
    };

    if (executeEditOrApproval) {
      const actionType = editingTeacher ? 'edit' : 'create';
      executeEditOrApproval('lms_teachers', actionType, payload, saveAction, 'staff', editingTeacher?.id);
      setIsModalOpen(false);
    } else {
      await saveAction();
    }
  };

  const performDelete = async (id: string) => {
    setIsDeleting(true);
    const deleteAction = async () => {
      try {
        await api.delete(`/erp/staff/${id}`);
        fetchTeachers();
      } catch (error) {
        alert('Failed to delete teacher account');
      } finally {
        setIsDeleting(false);
        setDeleteConfirm(null);
      }
    };

    if (executeEditOrApproval) {
      executeEditOrApproval('lms_teachers', 'delete', null, deleteAction, 'staff', id);
      setIsDeleting(false);
      setDeleteConfirm(null);
    } else {
      await deleteAction();
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(
      (t: any) =>
        (t.firstName || '').toLowerCase().includes(q) ||
        (t.lastName || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.loginUsername || '').toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  const columns = [
    {
      key: 'name',
      label: 'Teacher Name',
      render: (_val: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#8B0000]/10 dark:bg-[#8B0000]/30 text-[#8B0000] dark:text-[#ff6b6b] flex items-center justify-center font-bold text-sm shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.firstName} {row.lastName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ID: {row.employeeId || row.id.substring(0, 8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact Info',
      render: (_val: any, row: any) => (
        <div className="space-y-1">
          {row.email && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              {row.email}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'loginUsername',
      label: 'Username',
      render: (val: string) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80] border border-[#8B0000]/20">
          <Shield className="w-3 h-3" />
          {val || 'No Credentials'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Teachers</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80]">
              {teachers.length} Total
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Create teacher profiles and manage academic staff login credentials.
          </p>
        </div>
        {permission !== 'view' && (
          <AdminButton onClick={() => handleOpenModal()}>
            <UserPlus className="w-4 h-4" /> Create Teacher
          </AdminButton>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#1a1a2e] p-4 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 transition-all font-medium"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Showing {filteredTeachers.length} of {teachers.length} teachers
        </div>
      </div>

      {/* Teachers Table */}
      <AdminTable
        columns={columns}
        data={filteredTeachers}
        isLoading={isLoading}
        onEdit={permission !== 'view' ? handleOpenModal : undefined}
        onDelete={permission !== 'view' ? (t) => setDeleteConfirm(t.id) : undefined}
      />

      {/* Create / Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? 'Edit Teacher Details' : 'Create New Teacher Account'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AdminInput
              label="First Name *"
              placeholder="e.g. John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <AdminInput
              label="Last Name *"
              placeholder="e.g. Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminInput
              label="Email Address"
              type="email"
              placeholder="e.g. teacher@nermai.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <AdminInput
              label="Phone Number"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="border-t border-gray-100 dark:border-white/10 pt-4 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Portal Access Credentials
            </h3>
            <AdminInput
              label="Login Username *"
              placeholder="e.g. teacher_john"
              value={formData.loginUsername}
              onChange={(e) => setFormData({ ...formData, loginUsername: e.target.value })}
              required
            />
            <AdminInput
              label={editingTeacher ? 'New Login Password (leave empty to keep current)' : 'Login Password *'}
              type="password"
              placeholder="••••••••"
              value={formData.loginPassword}
              onChange={(e) => setFormData({ ...formData, loginPassword: e.target.value })}
              required={!editingTeacher}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/10">
            <AdminButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit">Save Teacher</AdminButton>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirm
        isOpen={!!deleteConfirm}
        title="Delete Teacher Account"
        message="Are you sure you want to delete this teacher account? This will also disable their portal access credentials."
        isDeleting={isDeleting}
        onConfirm={() => deleteConfirm && performDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
