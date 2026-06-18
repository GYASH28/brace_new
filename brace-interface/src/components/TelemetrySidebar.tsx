import React, { useEffect, useMemo, useState } from 'react';
import { braceClient } from '../lib/braceClient';

type LocalState = {
  approvals?: unknown[];
  tasks?: unknown[];
  agentTasks?: { status?: string }[];
  permissions?: Record<string, { enabled?: boolean }>;
};

type AssistantStatusShape = {
  brain?: { provider?: string; online?: boolean; configured?: boolean };
  model?: { primary?: string; fallback?: string };
  legacyEnabled?: boolean;
  memory?: {
    obsidian?: { ok?: boolean; configured?: boolean; path?: string };
    firebase?: { ok?: boolean; configured?: boolean; projectId?: string };
  };
  tools?: { safeMode?: boolean; count?: number };
};

type SystemInfoShape = {
  cpu?: number;
  ram?: number;
  ramDetail?: string;
  storage?: number;
  storageDetail?: string;
  updatedAt?: string;
  os?: { platform?: string; release?: string; uptimeSeconds?: number };
};

type LogLike = { id?: string; time?: string; type?: string; message?: string; riskLevel?: string; result?: string };

type PanelData = {
  state: LocalState;
  status: AssistantStatusShape | null;
  system: SystemInfoShape | null;
  tools: unknown[];
  memories: unknown[];
  logs: LogLike[];
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function boolLabel(value: unknown) {
  return value ? 'online' : 'not configured';
}

function pct(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : 'unavailable';
}

function formatLogTime(value?: string) {
  if (!value) return '--:--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

export const TelemetrySidebar: React.FC = () => {
  const [data, setData] = useState<PanelData>({ state: {}, status: null, system: null, tools: [], memories: [], logs: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [state, status, system, tools, memories, logs] = await Promise.all([
          braceClient.state().catch(() => ({})),
          braceClient.assistantStatus().catch(() => null),
          braceClient.systemInfo().catch(() => null),
          braceClient.listTools().catch(() => []),
          braceClient.listMemories().catch(() => []),
          braceClient.listLogs().catch(() => []),
        ]);
        if (cancelled) return;
        setData({
          state: (state || {}) as LocalState,
          status: (status || null) as AssistantStatusShape | null,
          system: (system || null) as SystemInfoShape | null,
          tools: asArray(tools),
          memories: asArray(memories),
          logs: asArray(logs) as LogLike[],
        });
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load telemetry.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const metrics = useMemo(() => {
    const pendingApprovals = asArray(data.state.approvals).length;
    const taskRecords = asArray(data.state.tasks).length + asArray(data.state.agentTasks).length;
    const activeRuns = (data.state.agentTasks || []).filter((task) => /running|active|queued|planning/i.test(String(task?.status || ''))).length;
    const enabledPermissions = Object.values(data.state.permissions || {}).filter((permission) => permission?.enabled).length;
    return { pendingApprovals, taskRecords, activeRuns, enabledPermissions };
  }, [data.state]);

  const recentLogs = data.logs.slice(0, 10);

  return (
    <aside style={{ height: '100%', minHeight: 520, background: '#070a10', color: '#e2e8f0', border: '1px solid rgba(34,211,238,0.14)', borderRadius: 12, overflow: 'hidden' }}>
      <header style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Telemetry Sidebar</h2>
        <div style={{ color: '#94a3b8', fontSize: 11 }}>Live local state. No simulated counters.</div>
      </header>

      {error ? (
        <div style={{ padding: 14, color: '#fda4af', fontSize: 12 }}>
          {error}
          <div style={{ color: '#94a3b8', marginTop: 8 }}>If using browser mode, start the backend with <code>npm run backend:localhost</code>.</div>
        </div>
      ) : (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Approvals', metrics.pendingApprovals, metrics.pendingApprovals ? '#fb7185' : '#10b981'],
              ['Active runs', metrics.activeRuns, metrics.activeRuns ? '#22d3ee' : '#64748b'],
              ['Tasks', metrics.taskRecords, '#cbd5e1'],
              ['Tools', data.tools.length || data.status?.tools?.count || 0, '#67e8f9'],
              ['Memories', data.memories.length, '#a78bfa'],
              ['Permissions', metrics.enabledPermissions, '#fbbf24'],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                <div style={{ color: String(color), fontFamily: 'monospace', fontSize: 18, marginTop: 3 }}>{String(value)}</div>
              </div>
            ))}
          </section>

          <section style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
            <h3 style={{ margin: 0, color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Runtime status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 5, marginTop: 8, fontSize: 11 }}>
              <div>Brain: <span style={{ color: data.status?.brain?.online || data.status?.brain?.configured ? '#67e8f9' : '#94a3b8' }}>{data.status?.brain?.provider || 'provider unavailable'} · {boolLabel(data.status?.brain?.online || data.status?.brain?.configured)}</span></div>
              <div>Model: <span style={{ color: '#cbd5e1' }}>{data.status?.model?.primary || 'not selected'}</span></div>
              <div>Safe mode: <span style={{ color: data.status?.tools?.safeMode === false ? '#fda4af' : '#86efac' }}>{data.status?.tools?.safeMode === false ? 'disabled' : 'enabled/unknown-safe'}</span></div>
              <div>Obsidian memory: <span style={{ color: data.status?.memory?.obsidian?.configured ? '#86efac' : '#94a3b8' }}>{boolLabel(data.status?.memory?.obsidian?.configured)}</span></div>
              <div>Firebase memory: <span style={{ color: data.status?.memory?.firebase?.configured ? '#86efac' : '#94a3b8' }}>{boolLabel(data.status?.memory?.firebase?.configured)}</span></div>
            </div>
          </section>

          <section style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
            <h3 style={{ margin: 0, color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Host telemetry</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, fontSize: 11 }}>
              <div>CPU <span style={{ color: '#67e8f9' }}>{pct(data.system?.cpu)}</span></div>
              <div>RAM <span style={{ color: '#67e8f9' }}>{pct(data.system?.ram)}</span></div>
              <div>Storage <span style={{ color: '#67e8f9' }}>{pct(data.system?.storage)}</span></div>
              <div>OS <span style={{ color: '#cbd5e1' }}>{data.system?.os?.platform || 'unknown'}</span></div>
            </div>
          </section>

          <section style={{ background: '#03060a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10 }}>
            <h3 style={{ margin: 0, color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Local activity tail</h3>
            {loading ? <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>Loading telemetry…</div> : recentLogs.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>No activity log entries found.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentLogs.map((log, index) => (
                  <li key={log.id || `${log.time}-${index}`} style={{ fontFamily: 'monospace', fontSize: 10, color: log.riskLevel === 'high' ? '#fda4af' : '#86efac' }}>
                    <span style={{ color: '#64748b' }}>[{formatLogTime(log.time)}]</span> {log.type || 'event'} · {log.message || 'no message'}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </aside>
  );
};
