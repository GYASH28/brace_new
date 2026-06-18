import React, { useEffect, useMemo, useState } from 'react';
import { braceClient } from '../lib/braceClient';

type LogLike = {
  id?: string;
  time?: string;
  type?: string;
  message?: string;
  riskLevel?: string;
  result?: string;
};

type TaskLike = {
  id?: string;
  command?: string;
  goal?: string;
  intent?: string;
  status?: string;
  riskLevel?: string;
  steps?: { id?: string; title?: string; tool?: string; status?: string; riskLevel?: string }[];
  createdAt?: string;
  updatedAt?: string;
};

type LocalState = { agentTasks?: TaskLike[] };

type TraceRow = {
  id: string;
  actor: string;
  step: string;
  status: string;
  detail: string;
  time?: string;
  risk?: string;
};

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function statusColor(status: string) {
  const raw = status.toLowerCase();
  if (/complete|ok|success|done/.test(raw)) return '#10b981';
  if (/fail|error|deny|reject/.test(raw)) return '#f43f5e';
  if (/approval|blocked|pending/.test(raw)) return '#f59e0b';
  if (/run|active|start|queued|planning/.test(raw)) return '#22d3ee';
  return '#64748b';
}

export const RunTrace: React.FC = () => {
  const [state, setState] = useState<LocalState>({});
  const [logs, setLogs] = useState<LogLike[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rawState, rawLogs] = await Promise.all([
          braceClient.state().catch(() => ({})),
          braceClient.listLogs().catch(() => []),
        ]);
        if (cancelled) return;
        setState((rawState || {}) as LocalState);
        setLogs(Array.isArray(rawLogs) ? rawLogs as LogLike[] : []);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load run trace.');
      }
    }
    load();
    const timer = window.setInterval(load, 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const rows = useMemo<TraceRow[]>(() => {
    const taskRows = (state.agentTasks || []).flatMap((task, taskIndex) => {
      const base: TraceRow = {
        id: String(task.id || `agent-task-${taskIndex}`),
        actor: task.intent || 'Agent plan',
        step: task.goal || task.command || 'Agent task',
        status: task.status || 'pending',
        detail: `${task.steps?.length || 0} planned step(s)`,
        time: task.updatedAt || task.createdAt,
        risk: task.riskLevel,
      };
      const steps = (task.steps || []).map((step, stepIndex) => ({
        id: `${base.id}-step-${step.id || stepIndex}`,
        actor: task.intent || 'Agent step',
        step: step.title || step.tool || 'Tool step',
        status: step.status || task.status || 'pending',
        detail: step.tool ? `tool: ${step.tool}` : 'no tool recorded',
        time: task.updatedAt || task.createdAt,
        risk: step.riskLevel,
      }));
      return [base, ...steps];
    });

    const logRows = logs.slice(0, 8).map((log, index) => ({
      id: String(log.id || `log-${index}`),
      actor: log.type || 'event',
      step: log.message || 'Activity log event',
      status: log.result || log.riskLevel || 'logged',
      detail: log.riskLevel ? `risk: ${log.riskLevel}` : 'local activity log',
      time: log.time,
      risk: log.riskLevel,
    }));

    return [...taskRows, ...logRows].slice(0, 18);
  }, [logs, state]);

  return (
    <div style={{ padding: 16, background: '#070a10', color: '#e2e8f0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', minHeight: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14 }}>Run Trace</h2>
          <div style={{ color: '#94a3b8', fontSize: 11 }}>Real agent plans and local activity logs.</div>
        </div>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>{rows.length} event(s)</span>
      </div>
      {error ? (
        <p style={{ color: '#fda4af', fontSize: 12 }}>{error}</p>
      ) : rows.length === 0 ? (
        <div style={{ padding: 18, color: '#64748b', fontSize: 12 }}>No run trace has been recorded yet. Start a real task or assistant tool call to populate this panel.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((trace) => (
            <li key={trace.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 10, alignItems: 'center', padding: 10, background: '#111827', borderRadius: 8, borderLeft: `4px solid ${statusColor(trace.status)}` }}>
              <span style={{ color: '#94a3b8', fontSize: 10 }}>{formatTime(trace.time)}</span>
              <span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{trace.step}</span>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: 10 }}>{trace.actor} · {trace.detail}</span>
              </span>
              <span style={{ color: statusColor(trace.status), fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{trace.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
