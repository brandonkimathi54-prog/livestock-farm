import React from 'react';
import { X } from 'lucide-react';
import type { Livestock } from '@/types';

interface Props {
  isOpen: boolean;
  item?: Livestock | null;
  onCancel: () => void;
  onConfirm: (item: Livestock) => void;
}

export default function DeleteConfirmModal({ isOpen, item, onCancel, onConfirm }: Props) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Delete Livestock Record?</h3>
            <p className="mt-2 text-sm text-slate-300">This action cannot be undone. This animal will be permanently removed from your Epaphroditus inventory ledger.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full p-1.5 text-white/60 hover:bg-white/5">
            <X />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(item)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
