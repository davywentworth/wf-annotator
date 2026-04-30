import { useState, useEffect } from 'react';
import { useServer } from './hooks/useServer.js';
import { WireframeView } from './components/WireframeView.jsx';
import { AnnotationPanel } from './components/AnnotationPanel.jsx';
import { DiffView } from './components/DiffView.jsx';
import { parseManifest } from './utils/manifest.js';

export default function App() {
  const { state, message, send } = useServer();
  const [wireframe, setWireframe] = useState(null);
  const [annotations, setAnnotations] = useState([]);

  useEffect(() => {
    if (!message) return;
    if (message.type === 'wireframe' || message.type === 'wireframe-update') {
      setWireframe(message);
      setAnnotations([]);
    }
  }, [message]);

  const addAnnotation = (a) => setAnnotations((prev) => [...prev, a]);
  const deleteAnnotation = (i) => setAnnotations((prev) => prev.filter((_, idx) => idx !== i));
  const addGeneral = (note) => addAnnotation({ type: 'general', note });

  const handleSubmit = () => {
    send({ type: 'submit', wireframeVersion: wireframe.version, annotations });
    setAnnotations([]);
  };

  const handleApprove = () => {
    send({ type: 'approve', wireframeVersion: wireframe.version });
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

      {state === 'error' && wireframe && (
        <div className="fixed bottom-4 left-4 bg-red-500 text-white text-xs px-3 py-2 rounded-lg shadow">
          Connection lost — annotations preserved. Reconnect to continue.
        </div>
      )}
    </div>
  );
}
