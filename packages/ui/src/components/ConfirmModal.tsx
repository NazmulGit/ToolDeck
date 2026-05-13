interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal-panel" style={{ width: 'min(440px, 90vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-line">
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <div className="p-5 text-sm text-ink-200">
          {message}
        </div>
        <div className="px-5 py-3 border-t border-line flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-ink-700 border border-ink-400 text-ink-100 hover:border-ink-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              danger
                ? 'bg-bad text-white hover:opacity-90'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
