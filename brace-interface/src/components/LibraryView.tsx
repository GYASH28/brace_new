import React, { useState } from 'react';

export const LibraryView: React.FC = () => {
  const [documents] = useState([
    { id: 1, title: 'Phase 1.pdf', type: 'PDF', size: '2MB' },
    { id: 2, title: 'Architectural Decisions.md', type: 'Markdown', size: '12KB' }
  ]);

  return (
    <div style={{ padding: '20px', background: '#0f0f0f', color: '#fff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h2>Library & Assets</h2>
        <button style={{ background: '#00e5ff', color: '#000', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Upload</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {documents.map(doc => (
          <div key={doc.id} style={{ background: '#1a1a1a', padding: '16px', borderRadius: '6px', border: '1px solid #333' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', wordBreak: 'break-word' }}>{doc.title}</div>
            <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{doc.type} • {doc.size}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
