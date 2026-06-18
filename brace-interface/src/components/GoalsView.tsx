import React, { useState } from 'react';

export const GoalsView: React.FC = () => {
  const [goals] = useState([
    { id: 1, title: 'Launch B.R.A.C.E OS', progress: 80, status: 'Active' },
    { id: 2, title: 'Integrate N8N', progress: 30, status: 'Planning' }
  ]);

  return (
    <div style={{ padding: '20px', background: '#0f0f0f', color: '#fff', borderRadius: '8px' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Active Goals</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {goals.map(goal => (
          <div key={goal.id} style={{ background: '#1a1a1a', padding: '16px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold' }}>{goal.title}</span>
              <span style={{ color: '#00e5ff' }}>{goal.status}</span>
            </div>
            <div style={{ background: '#333', height: '6px', borderRadius: '3px', marginTop: '10px' }}>
              <div style={{ width: `${goal.progress}%`, background: '#00e5ff', height: '100%', borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
