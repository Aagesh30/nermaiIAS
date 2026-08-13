import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../core/utils/cn';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto w-full max-h-[90vh] flex flex-col rounded-xl border border-border bg-surface p-6 shadow-2xl',
                size === 'sm' && 'max-w-sm',
                size === 'md' && 'max-w-lg',
                size === 'lg' && 'max-w-3xl',
                size === 'xl' && 'max-w-5xl',
                size === 'full' && 'max-w-[95vw]',
                className
              )}
            >
              {title && (
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h2 className="text-lg font-semibold text-textPrimary">{title}</h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-textSecondary hover:bg-surfaceHighlight hover:text-textPrimary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              {!title && (
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1 text-textSecondary hover:bg-surfaceHighlight hover:text-textPrimary transition-colors"
                >
                  <X size={20} />
                </button>
              )}
              <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
