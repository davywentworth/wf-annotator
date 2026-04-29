import { useState } from 'react';
import { AnnotationCard } from './AnnotationCard.jsx';

export function AnnotationPanel({ annotations, onDeleteAnnotation, onAddGeneral, onSubmit, onApprove }) {
  const [addingGeneral, setAddingGeneral] = useState(false);
  const [generalNote, setGeneralNote] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const sorted = [
    ...annotations.filter((a) => a.type === 'general'),
    ...annotations.filter((a) => a.type !== 'general'),
  ];

  const submitGeneral = () => {
    if (!generalNote.trim()) return;
    onAddGeneral(generalNote.trim());
    setGeneralNote('');
    setAddingGeneral(false);
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white w-80 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800 text-sm">Annotations</h2>
        <button
          onClick={() => setAddingGeneral(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          + General note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {addingGeneral && (
          <div className="border border-gray-200 rounded-lg p-3 bg-white">
            <p className="text-xs font-medium text-gray-500 mb-2">General note</p>
            <textarea
              autoFocus
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitGeneral(); }
                if (e.key === 'Escape') { setAddingGeneral(false); setGeneralNote(''); }
              }}
              className="w-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              rows={3}
              placeholder="Overall feedback..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setAddingGeneral(false); setGeneralNote(''); }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitGeneral}
                disabled={!generalNote.trim()}
                className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {sorted.map((a, i) => (
          <AnnotationCard
            key={i}
            annotation={a}
            onDelete={() => onDeleteAnnotation(annotations.indexOf(a))}
          />
        ))}

        {sorted.length === 0 && !addingGeneral && (
          <p className="text-sm text-gray-400 text-center pt-8 px-2">
            Click elements to annotate, or drag to suggest moves.
          </p>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 space-y-2">
        <button
          onClick={onSubmit}
          disabled={annotations.length === 0}
          className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Submit for revision
        </button>
        <button
          onClick={() => setShowApproveConfirm(true)}
          className="w-full py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
        >
          Approve
        </button>
      </div>

      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-gray-800 mb-2">Approve wireframe?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will discard your current annotations and approve the wireframe. Proceed?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowApproveConfirm(false); onApprove(); }}
                className="text-sm bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
