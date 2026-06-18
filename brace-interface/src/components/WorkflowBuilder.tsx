import React, { useState } from 'react';

export const WorkflowBuilder: React.FC = () => {
  const [trigger, setTrigger] = useState('CRON');
  const [action, setAction] = useState('Extract Memory');

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', color: '#fff', borderRadius: '8px' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Automations & Workflow Builder</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Trigger (Phase 12)</label>
          <select value={trigger} onChange={e => setTrigger(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '10px', color: '#fff', width: '100%' }}>
            <option value="CRON">Scheduled Cron</option>
            <option value="WEBHOOK">Incoming Webhook</option>
            <option value="FILE">File Change</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Action</label>
          <select value={action} onChange={e => setAction(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '10px', color: '#fff', width: '100%' }}>
            <option value="Extract Memory">Extract Memory</option>
            <option value="Trigger Agent">Trigger Agent</option>
            <option value="Send Notification">Send Notification</option>
          </select>
        </div>

        <button style={{ background: '#4CAF50', border: 'none', padding: '10px', color: '#fff', cursor: 'pointer', borderRadius: '4px' }}>
          Save Automation
        </button>
      </div>
    </div>
  );
};
