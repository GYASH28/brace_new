import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { braceClient } from '../lib/braceClient';

type RuntimeNode = {
  id: string;
  label: string;
  detail: string;
  status: 'online' | 'active' | 'blocked' | 'idle' | 'unavailable';
  metric?: string;
};

type LocalState = {
  approvals?: unknown[];
  tasks?: unknown[];
  agentTasks?: { status?: string }[];
};

type AssistantStatusShape = {
  brain?: { online?: boolean; configured?: boolean; provider?: string };
  model?: { primary?: string };
  tools?: { count?: number; safeMode?: boolean };
  memory?: {
    obsidian?: { configured?: boolean; ok?: boolean };
    firebase?: { configured?: boolean; ok?: boolean };
  };
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function statusColors(status: RuntimeNode['status']) {
  switch (status) {
    case 'online':
      return { bg: '#0f2f28', border: '#10b981', text: '#d1fae5' };
    case 'active':
      return { bg: '#0e2933', border: '#22d3ee', text: '#cffafe' };
    case 'blocked':
      return { bg: '#35131a', border: '#f43f5e', text: '#ffe4e6' };
    case 'idle':
      return { bg: '#1f2430', border: '#64748b', text: '#e2e8f0' };
    default:
      return { bg: '#1b1b1d', border: '#475569', text: '#94a3b8' };
  }
}

function makeNode(node: RuntimeNode, x: number, y: number): Node {
  const colors = statusColors(node.status);
  return {
    id: node.id,
    position: { x, y },
    data: {
      label: (
        <div style={{ minWidth: 150, color: colors.text }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                display: 'inline-block',
                background: colors.border,
                boxShadow: node.status === 'active' || node.status === 'blocked' ? `0 0 10px ${colors.border}` : 'none',
              }}
            />
            {node.label}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>{node.detail}</div>
          {node.metric && <div style={{ color: colors.border, fontSize: 10, marginTop: 4 }}>{node.metric}</div>}
        </div>
      ),
    },
    style: {
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      boxShadow: node.status === 'active' || node.status === 'blocked' ? `0 0 22px ${colors.border}33` : 'none',
      padding: 10,
    },
  };
}

export const AgentCanvas: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtimeNodes, setRuntimeNodes] = useState<RuntimeNode[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rawState, rawStatus, rawTools, rawMemories] = await Promise.all([
          braceClient.state().catch(() => ({})),
          braceClient.assistantStatus().catch(() => ({})),
          braceClient.listTools().catch(() => []),
          braceClient.listMemories().catch(() => []),
        ]);
        if (cancelled) return;
        const state = (rawState || {}) as LocalState;
        const status = (rawStatus || {}) as AssistantStatusShape;
        const approvals = asArray(state.approvals);
        const agentTasks = asArray(state.agentTasks) as { status?: string }[];
        const localTasks = [...asArray(state.tasks), ...agentTasks];
        const activeRuns = agentTasks.filter((task) => /running|active|planning|queued/i.test(String(task.status || ''))).length;
        const toolCount = asArray(rawTools).length || status.tools?.count || 0;
        const memoryCount = asArray(rawMemories).length;
        const brainOnline = Boolean(status.brain?.online || status.brain?.configured);

        setRuntimeNodes([
          {
            id: 'assistant-core',
            label: 'Assistant Core',
            detail: status.brain?.provider ? `${status.brain.provider} · ${status.model?.primary || 'model not selected'}` : 'provider status unavailable',
            status: brainOnline ? (activeRuns ? 'active' : 'online') : 'unavailable',
            metric: activeRuns ? `${activeRuns} active run(s)` : 'no active runs reported',
          },
          {
            id: 'tool-gateway',
            label: 'Tool Gateway',
            detail: status.tools?.safeMode === false ? 'safe mode disabled' : 'safe mode enabled',
            status: toolCount ? 'online' : 'idle',
            metric: `${toolCount} registered tool(s)`,
          },
          {
            id: 'memory-vault',
            label: 'Memory Vault',
            detail: status.memory?.obsidian?.configured || status.memory?.firebase?.configured ? 'external memory configured' : 'local memory only',
            status: memoryCount ? 'online' : 'idle',
            metric: `${memoryCount} local memor${memoryCount === 1 ? 'y' : 'ies'}`,
          },
          {
            id: 'task-queue',
            label: 'Task Queue',
            detail: 'local tasks + agent plans',
            status: activeRuns ? 'active' : localTasks.length ? 'idle' : 'unavailable',
            metric: `${localTasks.length} task record(s)`,
          },
          {
            id: 'approval-gate',
            label: 'Approval Gate',
            detail: 'human-in-the-loop controls',
            status: approvals.length ? 'blocked' : 'online',
            metric: `${approvals.length} pending approval(s)`,
          },
        ]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load runtime state.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const graph = useMemo(() => {
    const positions: Record<string, [number, number]> = {
      'assistant-core': [260, 36],
      'tool-gateway': [72, 170],
      'memory-vault': [450, 170],
      'task-queue': [142, 320],
      'approval-gate': [380, 320],
    };
    const nextNodes = runtimeNodes.map((node) => makeNode(node, ...(positions[node.id] || [0, 0])));
    const active = runtimeNodes.some((node) => node.status === 'active' || node.status === 'blocked');
    const blocked = runtimeNodes.some((node) => node.id === 'approval-gate' && node.status === 'blocked');
    const nextEdges: Edge[] = [
      { id: 'assistant-tools', source: 'assistant-core', target: 'tool-gateway', animated: active, style: { stroke: '#22d3ee' } },
      { id: 'assistant-memory', source: 'assistant-core', target: 'memory-vault', animated: active, style: { stroke: '#22d3ee' } },
      { id: 'tools-tasks', source: 'tool-gateway', target: 'task-queue', animated: active, style: { stroke: '#64748b' } },
      { id: 'tasks-approval', source: 'task-queue', target: 'approval-gate', animated: blocked, style: { stroke: blocked ? '#f43f5e' : '#64748b' } },
    ];
    return { nextNodes, nextEdges };
  }, [runtimeNodes]);

  useEffect(() => {
    setNodes(graph.nextNodes);
    setEdges(graph.nextEdges);
  }, [graph, setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
    [setEdges],
  );

  if (error) {
    return (
      <div style={{ height: 360, border: '1px solid rgba(244,63,94,0.4)', borderRadius: 12, padding: 16, background: '#13090c', color: '#fecdd3' }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>STUC canvas unavailable</h2>
        <p style={{ color: '#fda4af', fontSize: 12 }}>{error}</p>
        <p style={{ color: '#94a3b8', fontSize: 11 }}>Start the local backend with <code>npm run backend:localhost</code> to populate live runtime telemetry.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 360, border: '1px solid rgba(34,211,238,0.22)', borderRadius: 12, background: '#05070d', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
        <strong>Spatial Telemetry Canvas</strong>
        <span style={{ color: '#94a3b8' }}>{loading ? 'refreshing…' : `${runtimeNodes.length} live runtime node(s)`}</span>
      </div>
      <div style={{ height: 318 }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
          <Controls />
          <MiniMap pannable zoomable />
          <Background color="rgba(34,211,238,0.18)" gap={22} />
        </ReactFlow>
      </div>
    </div>
  );
};
