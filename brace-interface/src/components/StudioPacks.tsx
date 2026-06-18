import React, { useState } from 'react';

export const StudioPacks: React.FC = () => {
  const [packs, setPacks] = useState([
    { id: 'content', name: 'Content Studio', enabled: true },
    { id: 'seo', name: 'SEO Studio', enabled: false },
    { id: 'dev', name: 'Development Studio', enabled: true }
  ]);

  const togglePack = (id: string) => {
    setPacks(packs.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', color: '#fff', borderRadius: '8px' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Studio Packs</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {packs.map(pack => (
          <div key={pack.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#1a1a1a', borderRadius: '6px' }}>
            <span>{pack.name}</span>
            <button onClick={() => togglePack(pack.id)} style={{ background: pack.enabled ? '#4CAF50' : '#333', border: 'none', padding: '5px 10px', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>
              {pack.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
