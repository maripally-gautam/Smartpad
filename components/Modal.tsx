import React, { useEffect, useRef } from 'react';
import { Keyboard } from '@capacitor/keyboard';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const initialTopRef = useRef<number | null>(null);

  // Lock the modal position when it opens and hide keyboard
  useEffect(() => {
    if (isOpen) {
      // Hide keyboard when modal opens to prevent position shifts
      try {
        Keyboard.hide();
      } catch (e) {
        // Keyboard plugin not available
      }

      // Reset position tracking when modal opens
      initialTopRef.current = null;

      // Capture initial position after a brief delay to let layout settle
      const timer = setTimeout(() => {
        if (modalContentRef.current) {
          const rect = modalContentRef.current.getBoundingClientRect();
          initialTopRef.current = rect.top;
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 animate-fade-in pt-[20vh]"
      onClick={onClose}
    >
      <div
        ref={modalContentRef}
        className="bg-white dark:bg-secondary p-6 rounded-2xl w-full max-w-sm mx-4 shadow-2xl border border-slate-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;
