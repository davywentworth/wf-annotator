import { useRef, useEffect, useState, useCallback } from 'react';
import { CommentInput } from './CommentInput.jsx';
import { getMagnitude } from '../utils/magnitude.js';

export function WireframeView({ html, labelMap, onAnnotation, faded = false }) {
  const hostRef = useRef(null);
  const overlayRef = useRef(null);
  const shadowRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return;
    if (!shadowRef.current) {
      shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
    }
    shadowRef.current.innerHTML = html;
  }, [html]);

  const getIdFromEl = (el) => {
    let cur = el;
    while (cur && cur.tagName !== 'HTML') {
      if (cur.id) return cur.id;
      cur = cur.parentElement;
    }
    return null;
  };

  const getElementAtPoint = useCallback((x, y) => {
    if (!overlayRef.current || !shadowRef.current) return null;
    overlayRef.current.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    overlayRef.current.style.pointerEvents = '';
    if (!el || !hostRef.current?.contains(el)) return null;
    // For shadow DOM, composedPath gives the inner element
    return el;
  }, []);

  const getShadowElAtPoint = useCallback((x, y) => {
    if (!overlayRef.current || !shadowRef.current) return null;
    overlayRef.current.style.pointerEvents = 'none';
    // Use a synthetic event trick: get the element, then check composedPath
    const topEl = document.elementFromPoint(x, y);
    overlayRef.current.style.pointerEvents = '';
    if (!topEl) return null;
    // If topEl is the shadow host, drill into shadow root
    if (topEl === hostRef.current) {
      return shadowRef.current.elementFromPoint
        ? shadowRef.current.elementFromPoint(x, y)
        : null;
    }
    return topEl;
  }, []);

  const getRectRelative = useCallback((id) => {
    const el = shadowRef.current?.getElementById(id);
    if (!el || !hostRef.current) return null;
    const elR = el.getBoundingClientRect();
    const hostR = hostRef.current.getBoundingClientRect();
    return { top: elR.top - hostR.top, left: elR.left - hostR.left, width: elR.width, height: elR.height };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) dragRef.current.moved = true;
      return;
    }
    const el = getShadowElAtPoint(e.clientX, e.clientY);
    const id = el ? getIdFromEl(el) : null;
    if (id !== hoveredId) {
      setHoveredId(id);
      setHoveredRect(id ? getRectRelative(id) : null);
    }
  }, [hoveredId, getShadowElAtPoint, getRectRelative]);

  const handleMouseLeave = useCallback(() => {
    if (!dragRef.current) { setHoveredId(null); setHoveredRect(null); }
  }, []);

  const handleMouseDown = useCallback((e) => {
    const el = getShadowElAtPoint(e.clientX, e.clientY);
    const id = el ? getIdFromEl(el) : null;
    if (!id) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
  }, [getShadowElAtPoint]);

  const handleClick = useCallback((e) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) return;

    const el = getShadowElAtPoint(e.clientX, e.clientY);
    const id = el ? getIdFromEl(el) : null;
    if (!id) return;
    const hostR = hostRef.current.getBoundingClientRect();
    // Anchor to click position so the popup stays visible regardless of element size.
    const clickX = e.clientX - hostR.left;
    const clickY = e.clientY - hostR.top;
    setCommentTarget({
      id,
      label: labelMap[id] || id,
      anchor: {
        x: Math.min(Math.max(clickX - 120, 4), hostR.width - 274),
        y: Math.min(clickY + 12, hostR.height - 160),
      },
    });
  }, [getShadowElAtPoint, labelMap]);

  const handleMouseUp = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || !drag.moved) return;
    dragRef.current = null;
    setHoveredId(null);
    setHoveredRect(null);

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const magnitude = getMagnitude(Math.sqrt(dx * dx + dy * dy));

    const targetEl = getShadowElAtPoint(e.clientX, e.clientY);
    const targetId = targetEl ? getIdFromEl(targetEl) : null;

    if (targetId && targetId !== drag.id) {
      onAnnotation({
        type: 'move',
        element: { selector: `#${drag.id}`, label: labelMap[drag.id] || drag.id },
        target: { selector: `#${targetId}`, position: dy < 0 ? 'before' : 'after' },
        magnitude,
      });
    } else {
      const direction = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      onAnnotation({
        type: 'move',
        element: { selector: `#${drag.id}`, label: labelMap[drag.id] || drag.id },
        direction,
        magnitude,
      });
    }
  }, [getShadowElAtPoint, labelMap, onAnnotation]);

  return (
    <div
      className="relative w-full h-full overflow-auto bg-gray-100"
      style={{ opacity: faded ? 0.5 : 1 }}
    >
      <div ref={hostRef} className="w-full min-h-full" />

      {/* Interaction overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ cursor: dragRef.current?.moved ? 'grabbing' : hoveredId ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      />

      {/* Hover ring */}
      {hoveredRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: hoveredRect.top,
            left: hoveredRect.left,
            width: hoveredRect.width,
            height: hoveredRect.height,
            outline: '2px solid #3b82f6',
            zIndex: 10,
          }}
        />
      )}

      {/* Comment input */}
      {commentTarget && (
        <CommentInput
          anchor={commentTarget.anchor}
          label={commentTarget.label}
          onSubmit={(note) => {
            onAnnotation({
              type: 'comment',
              selector: `#${commentTarget.id}`,
              label: commentTarget.label,
              note,
            });
            setCommentTarget(null);
          }}
          onCancel={() => setCommentTarget(null)}
        />
      )}
    </div>
  );
}
