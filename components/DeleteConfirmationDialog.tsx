import React from 'react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Note?',
  message = 'This action is permanent and cannot be undone.',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-secondary p-6 rounded-lg w-full max-w-sm mx-4 text-center shadow-lg">
        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-2">{title}</h2>
        <p className="text-slate-600 dark:text-text-secondary mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-text-primary font-semibold hover:bg-slate-300 dark:hover:bg-opacity-80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;
