import { useState, useEffect, useRef } from 'react';
import { useServer } from './hooks/useServer.js';
import { WireframeView } from './components/WireframeView.jsx';
import { AnnotationPanel } from './components/AnnotationPanel.jsx';
import { DiffView } from './components/DiffView.jsx';
import { parseManifest } from './utils/manifest.js';

export default function App() {
  const { state, message, send } = useServer();
  const [wireframe, setWireframe] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [done, setDone] = useState(null); // null | 'submitted' | 'approved'
  const prevVersionRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    if (message.type !== 'wireframe' && message.type !== 'wireframe-update') return;
    // Clear annotations only when the version advances (new round), not on SSE reconnect.
    if (prevVersionRef.current !== message.version) {
      setAnnotations([]);
      prevVersionRef.current = message.version;
    }
    setWireframe(message);
  }, [message]);

  const addAnnotation = (a) => setAnnotations((prev) => [...prev, a]);
  const deleteAnnotation = (i) => setAnnotations((prev) => prev.filter((_, idx) => idx !== i));
  const addGeneral = (note) => addAnnotation({ type: 'general', note });

  const handleSubmit = async () => {
    if (!wireframe) return;
    const ok = await send({ type: 'submit', wireframeVersion: wireframe.version, annotations });
    if (ok) {
      setAnnotations([]);
      setDone('submitted');
      setTimeout(() => window.close(), 1500);
    }
  };

  const handleApprove = async () => {
    if (!wireframe) return;
    const ok = await send({ type: 'approve', wireframeVersion: wireframe.version });
    if (ok) {
      setDone('approved');
      setTimeout(() => window.close(), 1500);
    }
  };

  if (state === 'connecting' && !wireframe) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Connecting to wf-annotator server...</p>
        </div>
      </div>
    );
  }

  if (state === 'error' && !wireframe) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-red-500 text-sm">Could not connect. Make sure the server is running.</p>
      </div>
    );
  }

  if (!wireframe) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-400 text-sm">Waiting for wireframe...</p>
      </div>
    );
  }

  const labelMap = parseManifest(wireframe.html);
  const isDiff = wireframe.type === 'wireframe-update';

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {isDiff ? (
          <DiffView
            currentHtml={wireframe.html}
            previousHtml={wireframe.previousHtml}
            previousAnnotations={wireframe.previousAnnotations}
            version={wireframe.version}
            labelMap={labelMap}
            onAnnotation={addAnnotation}
          />
        ) : (
          <WireframeView
            html={wireframe.html}
            labelMap={labelMap}
            onAnnotation={addAnnotation}
          />
        )}
      </div>

      <AnnotationPanel
        annotations={annotations}
        onDeleteAnnotation={deleteAnnotation}
        onAddGeneral={addGeneral}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
      />

      {done && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-gray-800 font-semibold text-lg">
              {done === 'approved' ? 'Wireframe approved!' : 'Annotations submitted!'}
            </p>
            <p className="text-gray-400 text-sm mt-1">You can close this tab.</p>
          </div>
        </div>
      )}
    </div>
  );
}
