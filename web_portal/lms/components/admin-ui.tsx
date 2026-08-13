import React from 'react';
import { Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSkeleton } from './ui/Skeleton';

// ─── Admin Input ─────────────────────────────────────────────────────────────

export const AdminInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{label}</label>
      <input
        ref={ref}
        className={`bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 transition-all text-sm font-medium shadow-sm ${className}`}
        {...props}
      />
    </div>
  )
);
AdminInput.displayName = 'AdminInput';

// ─── Admin Select ────────────────────────────────────────────────────────────

export const AdminSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string; disabled?: boolean }[] }
>(({ label, options, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{label}</label>
    <select
      ref={ref}
      className={`bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 transition-all appearance-none text-sm font-medium shadow-sm cursor-pointer ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
));
AdminSelect.displayName = 'AdminSelect';

// ─── Admin Button ────────────────────────────────────────────────────────────

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const AdminButton: React.FC<AdminButtonProps> = ({ variant = 'primary', isLoading, children, className = '', disabled, ...props }) => {
  const baseStyle = 'px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95';
  const variants = {
    primary: 'bg-gradient-to-r from-[#8B0000] to-[#b71c1c] text-white hover:shadow-lg hover:shadow-[#8B0000]/30 border border-transparent hover:brightness-110',
    secondary: 'bg-white dark:bg-[#1a1a2e] text-gray-700 dark:text-white border border-gray-300 dark:border-[#8B0000]/30 hover:bg-gray-100 dark:hover:bg-[#8B0000]/20',
    danger: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20',
  };
  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {isLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
};

// ─── Admin Table ─────────────────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  render?: (val: any, row: any) => React.ReactNode;
}

interface AdminTableProps {
  columns: Column[];
  data: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  isLoading?: boolean;
}

export const AdminTable: React.FC<AdminTableProps> = ({ columns, data, onEdit, onDelete, isLoading }) => {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-12 text-center bg-white dark:bg-[#1a1a2e]/60 rounded-2xl border border-dashed border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <p className="text-base font-semibold">No records found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or click Create to add one.</p>
      </div>
    );
  }
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 bg-white dark:bg-[#1a1a2e]/90 shadow-sm backdrop-blur-sm">
      <table className="w-full text-left text-sm text-gray-800 dark:text-gray-200">
        <thead className="bg-[#8B0000]/5 dark:bg-[#8B0000]/25 text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-[#8B0000]/30">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-4 font-bold">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-6 py-4 text-right font-bold">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-[#8B0000]/15">
          {data.map((row, idx) => (
            <tr key={row.id || idx} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 whitespace-nowrap font-medium">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        title="Edit"
                        className="text-amber-600 dark:text-yellow-400 hover:bg-amber-50 dark:hover:bg-yellow-400/10 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        title="Delete"
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Admin Modal ─────────────────────────────────────────────────────────────

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[75vh]">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#8B0000]/20 bg-gray-50 dark:bg-gradient-to-r dark:from-[#8B0000]/10 dark:to-transparent">
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Delete Confirm Dialog ───────────────────────────────────────────────────

interface DeleteConfirmProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirm: React.FC<DeleteConfirmProps> = ({
  isOpen, title = 'Delete Item', message = 'Are you sure? This action cannot be undone.',
  isDeleting, onConfirm, onCancel
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0f0f1a] border border-red-200 dark:border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel} disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >Cancel</button>
          <button
            onClick={onConfirm} disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
