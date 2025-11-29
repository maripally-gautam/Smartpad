import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-secondary p-6 rounded-lg w-full max-w-sm mx-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;
