import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AddLivestockModal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2rem] border border-zinc-700 bg-[#24292e]/95 shadow-2xl text-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
