import { useState, useRef, useCallback } from 'react';
import { WireframeView } from './WireframeView.jsx';
import { parseManifest } from '../utils/manifest.js';

export function DiffView({ currentHtml, previousHtml, previousAnnotations, version, labelMap, onAnnotation }) {
  const [dividerPct, setDividerPct] = useState(50);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const prevLabelMap = parseManifest(previousHtml);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;

    const onMove = (ev) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.max(20, Math.min(80, ((ev.clientX - rect.left) / rect.width) * 100));
      setDividerPct(pct);
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div ref={containerRef} className="flex w-full h-full relative select-none overflow-hidden">
      {/* Previous version */}
      <div className="h-full relative overflow-hidden" style={{ width: `${dividerPct}%` }}>
        <div className="absolute top-2 left-2 z-10 bg-gray-700 text-white text-xs px-2 py-1 rounded pointer-events-none">
          v{version - 1}
        </div>
        <WireframeView
          html={previousHtml}
          labelMap={prevLabelMap}
          onAnnotation={() => {}}
          faded
        />
      </div>

      {/* Draggable divider */}
      <div
        className="w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize flex-shrink-0 z-20 transition-colors"
        onMouseDown={handleDividerMouseDown}
      />

      {/* New version */}
      <div className="h-full relative overflow-hidden flex-1">
        <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded pointer-events-none">
          v{version} — reviewing changes
        </div>
        <WireframeView
          html={currentHtml}
          labelMap={labelMap}
          onAnnotation={onAnnotation}
        />
      </div>
    </div>
  );
}
