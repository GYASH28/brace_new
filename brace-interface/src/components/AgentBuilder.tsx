import React, { useState } from 'react';

export const AgentBuilder: React.FC = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSave = () => {
    console.log("Saving agent:", { name, role, prompt });
    // In a real implementation, this would send to POST /agents API
  };

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: '#fff', borderRadius: '8px' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Agent Builder</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        <input 
          placeholder="Agent Name (e.g. Code Reviewer)" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          style={{ background: '#000', border: '1px solid #333', padding: '10px', color: '#fff' }}
        />
        <input 
          placeholder="Role" 
          value={role} 
          onChange={e => setRole(e.target.value)} 
          style={{ background: '#000', border: '1px solid #333', padding: '10px', color: '#fff' }}
        />
        <textarea 
          placeholder="System Prompt" 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)} 
          rows={5}
          style={{ background: '#000', border: '1px solid #333', padding: '10px', color: '#fff' }}
        />
        <button onClick={handleSave} style={{ background: '#4CAF50', border: 'none', padding: '10px', color: '#fff', cursor: 'pointer' }}>
          Save Agent
        </button>
      </div>
    </div>
  );
};
