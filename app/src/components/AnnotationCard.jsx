export function AnnotationCard({ annotation, onDelete }) {
  const badgeClass = {
    comment: 'bg-blue-100 text-blue-700',
    move: 'bg-purple-100 text-purple-700',
    general: 'bg-gray-100 text-gray-700',
  }[annotation.type] ?? 'bg-gray-100 text-gray-700';

  const label =
    annotation.type === 'comment' ? annotation.label :
    annotation.type === 'move' ? annotation.element?.label :
    null;

  const content =
    annotation.type === 'comment' ? annotation.note :
    annotation.type === 'move' ? formatMove(annotation) :
    annotation.note;

  return (
    <div className="p-3 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
            {annotation.type}
          </span>
          {label && <span className="text-xs text-gray-500">{label}</span>}
        </div>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 text-sm leading-none"
          aria-label="Delete annotation"
        >
          ×
        </button>
      </div>
      <p className="text-sm text-gray-700">{content}</p>
    </div>
  );
}

function formatMove(a) {
  const who = a.element?.label ?? a.element?.selector ?? 'element';
  if (a.target) {
    return `Move "${who}" ${a.magnitude} → ${a.target.position} "${a.target.selector}"`;
  }
  return `Move "${who}" ${a.magnitude} to the ${a.direction}`;
}
