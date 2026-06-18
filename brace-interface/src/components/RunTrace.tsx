import React from 'react';

const mockTraces = [
  { id: 1, agent: 'Conductor', step: 'PLANNING', duration: '120ms', status: 'COMPLETED' },
  { id: 2, agent: 'Researcher', step: 'COLLECTING', duration: '1500ms', status: 'COMPLETED' },
  { id: 3, agent: 'Builder', step: 'IMPLEMENTING', duration: '450ms', status: 'RUNNING' }
];

export const RunTrace: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#0a0a0a', color: '#fff', borderRadius: '8px' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Run Trace (DAG)</h2>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '16px' }}>
        {mockTraces.map(trace => (
          <li key={trace.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#1a1a1a', marginBottom: '8px', borderRadius: '4px', borderLeft: trace.status === 'COMPLETED' ? '4px solid #4CAF50' : '4px solid #ffbb33' }}>
            <span><strong>{trace.agent}</strong> - {trace.step}</span>
            <span style={{ color: '#888' }}>{trace.duration} | {trace.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
