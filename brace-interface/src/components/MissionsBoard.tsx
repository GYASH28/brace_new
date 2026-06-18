import React from 'react';

const tasks = [
  { id: 't1', title: 'Setup OS environment', status: 'done', agent: 'Builder' },
  { id: 't2', title: 'Implement React Flow', status: 'review', agent: 'Conductor' },
  { id: 't3', title: 'Establish Telemetry', status: 'running', agent: 'QA Sentinel' },
  { id: 't4', title: 'Cron Integrations', status: 'pending', agent: 'Unassigned' },
];

export const MissionsBoard: React.FC = () => {
  const columns = ['pending', 'running', 'review', 'done'];

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#111', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>MISSIONS (KANBAN)</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        {columns.map(col => (
          <div key={col} style={{ flex: 1, background: '#1a1a1a', padding: '16px', borderRadius: '8px', minHeight: '400px' }}>
            <h3 style={{ textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>{col}</h3>
            {tasks.filter(t => t.status === col).map(t => (
              <div key={t.id} style={{ background: '#222', padding: '12px', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #4CAF50' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{t.title}</h4>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Agent: {t.agent}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
