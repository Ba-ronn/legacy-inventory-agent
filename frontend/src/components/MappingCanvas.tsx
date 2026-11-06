import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Position,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { MappingManifest } from '../lib/api';

/**
 * The canvas used to ship its own hardcoded palette, so it stayed dark when the
 * app went light. It now reads the same CSS variables as everything else and
 * re-reads them whenever the theme class on <html> changes.
 */
const rawToken = (name: string) => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const readToken = (name: string, fallback: string) => {
  const value = rawToken(name);
  return value ? `rgb(${value})` : fallback;
};

interface CanvasTokens {
  primary: string;
  onPrimary: string;
  accent: string;
  surface: string;
  sunken: string;
  line: string;
  ink: string;
  inkMuted: string;
}

const readTokens = (): CanvasTokens => ({
  primary: readToken('--c-primary', '#1a936f'),
  onPrimary: readToken('--c-on-primary', '#ffffff'),
  accent: readToken('--c-accent', '#88d498'),
  surface: readToken('--c-surface', '#ffffff'),
  sunken: readToken('--c-surface-sunken', '#eeeadf'),
  line: readToken('--c-line', '#dbd5c6'),
  ink: readToken('--c-ink', '#0e2c38'),
  inkMuted: readToken('--c-ink-muted', '#4a646e'),
});

function useCanvasTokens(): CanvasTokens {
  const [tokens, setTokens] = useState<CanvasTokens>(readTokens);

  useEffect(() => {
    const observer = new MutationObserver(() => setTokens(readTokens()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return tokens;
}

/** A table node: a titled header over the columns taking part in the mapping. */
const tableLabel = (
  title: string,
  subtitle: string,
  columns: string[],
  tone: 'standard' | 'legacy',
  tokens: CanvasTokens,
) => (
  <div className="text-left">
    <div
      className="flex items-baseline justify-between gap-3 border-b px-3 py-2"
      style={{ borderColor: tone === 'standard' ? 'rgb(255 255 255 / 0.25)' : tokens.line }}
    >
      <span className="text-[12px] font-bold tracking-tight">{title}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{subtitle}</span>
    </div>
    <div className="space-y-0.5 px-3 py-2 font-mono text-[10px] leading-relaxed opacity-85">
      {columns.map((c) => (
        <div key={c} className="truncate">
          {c}
        </div>
      ))}
    </div>
  </div>
);

/** Turns the approved manifest into the two facing columns of the bridge. */
const buildGraph = (manifest: MappingManifest | null, tokens: CanvasTokens) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!manifest) return { nodes, edges };

  const base = {
    borderRadius: '12px',
    padding: 0,
    fontSize: 12,
    textAlign: 'left' as const,
    overflow: 'hidden',
  };

  const standardStyle = {
    ...base,
    background: tokens.primary,
    color: tokens.onPrimary,
    border: 'none',
    width: 230,
    boxShadow: '0 8px 24px -10px rgb(0 0 0 / 0.45)',
  };

  const legacyStyle = {
    ...base,
    background: tokens.surface,
    color: tokens.ink,
    border: `1px solid ${tokens.line}`,
    width: 250,
    boxShadow: '0 8px 24px -14px rgb(0 0 0 / 0.5)',
  };

  Object.entries(manifest.tables).forEach(([logicalName, tableMap], index) => {
    const y = index * 270;
    const logicalColumns = Object.keys(tableMap.columns);
    const physicalColumns = Object.values(tableMap.columns).map((c) => c.physical_name);

    const standardId = `std-${logicalName}`;
    const legacyId = `leg-${logicalName}`;

    nodes.push({
      id: standardId,
      data: { label: tableLabel(logicalName, 'standard', logicalColumns, 'standard', tokens) },
      position: { x: 40, y: y + 60 },
      style: standardStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    nodes.push({
      id: legacyId,
      data: { label: tableLabel(tableMap.physical_name, 'legacy', physicalColumns, 'legacy', tokens) },
      position: { x: 470, y },
      style: legacyStyle,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    edges.push({
      id: `e-${logicalName}`,
      source: standardId,
      target: legacyId,
      animated: true,
      label: `${logicalColumns.length} columns`,
      style: { stroke: tokens.primary, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: tokens.primary },
    });
  });

  return { nodes, edges };
};

interface MappingCanvasProps {
  manifest: MappingManifest | null;
}

const MappingCanvas = ({ manifest }: MappingCanvasProps) => {
  const tokens = useCanvasTokens();
  const graph = useMemo(() => buildGraph(manifest, tokens), [manifest, tokens]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: { stroke: tokens.primary, strokeWidth: 2 },
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: tokens.primary },
          },
          eds,
        ),
      ),
    [setEdges, tokens.primary],
  );

  return (
    <div className="h-full w-full" style={{ background: tokens.sunken }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.22 }}
      >
        <Controls showInteractive={false} position="bottom-left" />
        <Background variant={BackgroundVariant.Dots} color={tokens.inkMuted} gap={22} size={1} />
      </ReactFlow>
    </div>
  );
};

export default MappingCanvas;
