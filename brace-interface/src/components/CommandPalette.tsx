import React, { useState, useEffect } from 'react';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
      <div style={{ background: '#1a1a1a', width: '600px', borderRadius: '8px', padding: '20px', color: '#fff', border: '1px solid #333' }}>
        <input 
          autoFocus
          placeholder="Type a command or search..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', padding: '15px', background: '#000', border: '1px solid #444', color: '#fff', fontSize: '18px', borderRadius: '4px' }}
        />
        <div style={{ marginTop: '16px', color: '#888' }}>
          <p>Suggestions:</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #333' }}>/os - Open System Dashboard</li>
            <li style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #333' }}>Create new goal</li>
            <li style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #333' }}>Search Library</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
