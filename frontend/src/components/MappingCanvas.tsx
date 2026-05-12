import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Initial Mock Nodes demonstrating the Mapping
const initialNodes = [
  // Legacy Database Nodes (Left side)
  {
    id: 'legacy_table',
    type: 'default',
    data: { label: 'Legacy DB: TBL_STOCK_MST' },
    position: { x: 50, y: 100 },
    className: 'bg-[#1b1b1e]/80 backdrop-blur-md text-white border border-white/10 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] font-outfit font-bold p-4',
  },
  {
    id: 'legacy_col_sku',
    data: { label: 'Col: C_ITEM_CD' },
    position: { x: 100, y: 190 },
    className: 'bg-background/90 text-text-muted border border-white/5 rounded-lg px-4 py-2 text-sm font-inter',
  },
  {
    id: 'legacy_col_qty',
    data: { label: 'Col: N_QTY_ON_HAND' },
    position: { x: 100, y: 250 },
    className: 'bg-background/90 text-text-muted border border-white/5 rounded-lg px-4 py-2 text-sm font-inter',
  },

  // Standard Model Nodes (Right side)
  {
    id: 'std_table',
    type: 'default',
    data: { label: 'Standard: inventory' },
    position: { x: 550, y: 100 },
    className: 'bg-gradient-to-br from-primary to-primary-hover text-white border-none rounded-xl shadow-[0_0_30px_rgba(0,141,213,0.3)] font-outfit font-bold p-4',
  },
  {
    id: 'std_col_sku',
    data: { label: 'Field: sku' },
    position: { x: 550, y: 190 },
    className: 'bg-[#1b1b1e]/90 text-white border border-primary/50 rounded-lg px-4 py-2 text-sm font-inter shadow-[0_0_10px_rgba(0,141,213,0.1)]',
  },
  {
    id: 'std_col_qty',
    data: { label: 'Field: quantity' },
    position: { x: 550, y: 250 },
    className: 'bg-[#1b1b1e]/90 text-white border border-primary/50 rounded-lg px-4 py-2 text-sm font-inter shadow-[0_0_10px_rgba(0,141,213,0.1)]',
  },
];

// Initial Mock Edges showing AI Suggestions
const initialEdges = [
  { id: 'e_table', source: 'legacy_table', target: 'std_table', animated: true, style: { stroke: '#df3b57', strokeWidth: 3, opacity: 0.8 } },
  { id: 'e_sku', source: 'legacy_col_sku', target: 'std_col_sku', animated: true, style: { stroke: '#008dd5', strokeWidth: 2, opacity: 0.8 } },
  { id: 'e_qty', source: 'legacy_col_qty', target: 'std_col_qty', animated: true, style: { stroke: '#008dd5', strokeWidth: 2, opacity: 0.8 } },
];

const MappingCanvas: React.FC = () => {
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#008dd5', strokeWidth: 2 } } as any, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-transparent">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls className="bg-[#1b1b1e] border-white/10 fill-white" />
        <MiniMap 
          nodeStrokeColor="#373f51" 
          nodeColor="#008dd5" 
          maskColor="rgba(5, 5, 5, 0.8)" 
          style={{ backgroundColor: '#1b1b1e' }}
        />
        <Background color="#373f51" gap={20} size={2} />
      </ReactFlow>
    </div>
  );
};

export default MappingCanvas;
