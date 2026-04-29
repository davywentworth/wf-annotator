import { useState, useEffect, useRef } from 'react';

export function CommentInput({ anchor, label, onSubmit, onCancel }) {
  const [note, setNote] = useState('');
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => { if (note.trim()) onSubmit(note.trim()); };

  return (
    <div
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-64"
      style={{ top: anchor.y, left: anchor.x }}
    >
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <textarea
        ref={ref}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
        rows={3}
        placeholder="Add a comment... (Enter to submit)"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        <button
          onClick={submit}
          disabled={!note.trim()}
          className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
