import React from 'react';

export const TelemetrySidebar: React.FC = () => {
  return (
    <div style={{
      width: '300px',
      background: '#111',
      color: '#0f0',
      fontFamily: 'monospace',
      padding: '16px',
      borderLeft: '1px solid #333',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>TELEMETRY</h2>
      
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#888' }}>SYSTEM STATUS</h3>
        <p>OS Kernel: ONLINE</p>
        <p>Hive Mind: CONNECTED</p>
        <p>Agent Runner: IDLE</p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#888' }}>METRICS</h3>
        <p>Active Agents: 3</p>
        <p>Tokens Processed: 142,504</p>
        <p>Estimated Cost: $0.12</p>
      </div>

      <div>
        <h3 style={{ fontSize: '0.9rem', color: '#888' }}>LIVE LOG</h3>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.8rem', opacity: 0.8 }}>
          <li>[12:00:01] Conductor initialized.</li>
          <li>[12:00:05] Task assigned to Builder.</li>
          <li>[12:00:12] Builder executing 'write_to_file'.</li>
        </ul>
      </div>
    </div>
  );
};
