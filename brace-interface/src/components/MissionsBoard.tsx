import React, { useEffect, useMemo, useState } from 'react';
import { braceClient } from '../lib/braceClient';

type ApprovalLike = {
  id: string;
  tool?: string;
  input?: unknown;
  description?: string;
  createdAt?: string;
};

type TaskLike = {
  id?: string;
  title?: string;
  command?: string;
  goal?: string;
  detail?: string;
  status?: string;
  type?: string;
  riskLevel?: string;
  approvalId?: string;
  assignedAgent?: string;
};

type LocalState = {
  tasks?: TaskLike[];
  agentTasks?: TaskLike[];
  approvals?: ApprovalLike[];
};

type MissionCard = {
  id: string;
  title: string;
  detail: string;
  status: 'pending' | 'running' | 'blocked' | 'review' | 'done';
  agent: string;
  risk?: string;
  approval?: ApprovalLike;
};

const columns: { id: MissionCard['status']; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending triage', color: '#64748b' },
  { id: 'running', label: 'Active execution', color: '#22d3ee' },
  { id: 'blocked', label: 'Blocked / approval', color: '#f43f5e' },
  { id: 'review', label: 'Review phase', color: '#f59e0b' },
  { id: 'done', label: 'Committed', color: '#10b981' },
];

function normalizeStatus(status?: string, approvalId?: string): MissionCard['status'] {
  const raw = String(status || '').toLowerCase();
  if (approvalId || raw.includes('approval') || raw === 'blocked') return 'blocked';
  if (raw.includes('run') || raw.includes('active') || raw.includes('planning') || raw.includes('queued') || raw.includes('execut')) return 'running';
  if (raw.includes('review')) return 'review';
  if (raw.includes('done') || raw.includes('complete') || raw.includes('success')) return 'done';
  return 'pending';
}

function taskTitle(task: TaskLike) {
  return task.title || task.goal || task.command || task.detail || task.type || 'Untitled local task';
}

function formatDate(value?: string) {
  if (!value) return 'time unknown';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'time unknown';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' }).format(time);
}

export const MissionsBoard: React.FC<{ onSelectApproval?: (approval: ApprovalLike) => void }> = ({ onSelectApproval }) => {
  const [state, setState] = useState<LocalState>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const rawState = (await braceClient.state()) as LocalState;
        if (!cancelled) setState(rawState || {});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load tasks.');
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

  const cards = useMemo<MissionCard[]>(() => {
    const approvals = Array.isArray(state.approvals) ? state.approvals : [];
    const approvalCards = approvals.map((approval) => ({
      id: `approval-${approval.id}`,
      title: approval.description || `Approval requested: ${approval.tool || 'tool action'}`,
      detail: approval.tool ? `Tool payload awaiting operator review: ${approval.tool}` : 'Approval request is missing a tool name.',
      status: 'blocked' as const,
      agent: 'Assistant runtime',
      risk: 'operator review',
      approval,
    }));

    const taskCards = [...(state.agentTasks || []), ...(state.tasks || [])].map((task, index) => ({
      id: String(task.id || `task-${index}`),
      title: taskTitle(task),
      detail: task.detail || task.goal || task.command || task.type || 'No task details recorded.',
      status: normalizeStatus(task.status, task.approvalId),
      agent: task.assignedAgent || (task.command ? 'Local agent planner' : 'Local task list'),
      risk: task.riskLevel,
      approval: approvals.find((approval) => approval.id === task.approvalId),
    }));

    return [...approvalCards, ...taskCards];
  }, [state]);

  if (error) {
    return (
      <div style={{ padding: 18, color: '#fecdd3', background: '#14080d', border: '1px solid rgba(244,63,94,0.35)', borderRadius: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Missions unavailable</h2>
        <p style={{ fontSize: 12 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ color: '#e2e8f0', background: '#070a10', height: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14 }}>Actionable Kanban Matrix</h2>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Backed by local state. No demo tasks are injected.</div>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{loading ? 'loading…' : `${cards.length} card(s)`}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(190px, 1fr))', gap: 12, padding: 12, overflowX: 'auto' }}>
        {columns.map((col) => {
          const colCards = cards.filter((card) => card.status === col.id);
          return (
            <section key={col.id} style={{ minHeight: 260, background: '#101520', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              <header style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: col.color }} />{col.label}</span>
                <span style={{ color: '#94a3b8' }}>{colCards.length}</span>
              </header>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {colCards.length === 0 ? (
                  <div style={{ padding: 14, color: '#64748b', fontSize: 11, textAlign: 'center' }}>No local records in this lane.</div>
                ) : colCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => card.approval && onSelectApproval?.(card.approval)}
                    type="button"
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      color: '#e2e8f0',
                      background: card.status === 'blocked' ? '#2a1118' : '#161d2a',
                      border: `1px solid ${card.status === 'blocked' ? 'rgba(244,63,94,0.55)' : 'rgba(255,255,255,0.08)'}`,
                      borderLeft: `4px solid ${col.color}`,
                      borderRadius: 8,
                      padding: 10,
                      cursor: card.approval ? 'pointer' : 'default',
                      boxShadow: card.status === 'blocked' ? '0 0 18px rgba(244,63,94,0.14)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{card.status === 'blocked' ? '⚠ ' : ''}{card.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>{card.detail}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 9, color: '#cbd5e1', fontSize: 10 }}>
                      <span>{card.agent}</span>
                      <span style={{ color: card.status === 'blocked' ? '#fb7185' : '#94a3b8' }}>{card.risk || card.status}</span>
                    </div>
                    {card.approval && <div style={{ color: '#fda4af', fontSize: 9, marginTop: 6 }}>Click to review · {formatDate(card.approval.createdAt)}</div>}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
