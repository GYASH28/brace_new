import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: 'conductor', position: { x: 250, y: 5 }, data: { label: 'Conductor Agent' }, type: 'input' },
  { id: 'builder', position: { x: 100, y: 100 }, data: { label: 'Builder Agent' } },
  { id: 'researcher', position: { x: 400, y: 100 }, data: { label: 'Researcher Agent' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'conductor', target: 'builder', animated: true },
  { id: 'e1-3', source: 'conductor', target: 'researcher', animated: true },
];

export const AgentCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100%', height: '500px', border: '1px solid #333', borderRadius: '8px', background: '#0a0a0a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};
