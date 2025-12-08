import React, { useEffect, useRef } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  keepKeyboard?: boolean; // Option to keep keyboard open
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, keepKeyboard = false }) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const initialTopRef = useRef<number | null>(null);

  // Hide keyboard and blur active element when modal opens
  useEffect(() => {
    if (isOpen && !keepKeyboard) {
      // Blur any focused element to remove cursor
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Hide keyboard on native platforms
      if (Capacitor.isNativePlatform()) {
        Keyboard.hide().catch(() => { });
      }
    }
  }, [isOpen, keepKeyboard]);

  // Lock the modal position when it opens
  useEffect(() => {
    if (isOpen) {
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;
