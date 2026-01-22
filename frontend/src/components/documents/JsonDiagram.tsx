import { useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';

interface JsonDiagramProps {
  content: string;
  className?: string;
}

interface JsonNodeData extends Record<string, unknown> {
  label: string;
  type: 'object' | 'array' | 'primitive';
  value?: string;
  count?: number;
}

// Custom node component for JSON visualization
function JsonNode({ data }: { data: JsonNodeData }) {
  const bgColor =
    data.type === 'object'
      ? 'bg-blue-500/10 border-blue-500/50'
      : data.type === 'array'
        ? 'bg-green-500/10 border-green-500/50'
        : 'bg-gray-500/10 border-gray-500/50';

  const icon =
    data.type === 'object' ? '{ }' : data.type === 'array' ? '[ ]' : '•';

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg border-2 min-w-[120px] max-w-[200px]',
        'shadow-sm hover:shadow-md transition-shadow',
        'bg-background',
        bgColor
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">{icon}</span>
        <span className="font-medium text-sm truncate">{data.label}</span>
        {data.count !== undefined && (
          <span className="text-xs text-muted-foreground ml-auto">
            ({data.count})
          </span>
        )}
      </div>
      {data.value && (
        <div className="mt-1 text-xs text-muted-foreground truncate font-mono">
          {data.value}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  jsonNode: JsonNode,
};

// Layout nodes using dagre
function getLayoutedElements(
  nodes: Node<JsonNodeData>[],
  edges: Edge[],
  direction = 'TB'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 160;
  const nodeHeight = 60;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Convert JSON to nodes and edges
function jsonToNodesAndEdges(
  json: unknown,
  parentId: string | null = null,
  key: string = 'root',
  depth: number = 0,
  maxDepth: number = 3
): { nodes: Node<JsonNodeData>[]; edges: Edge[] } {
  const nodes: Node<JsonNodeData>[] = [];
  const edges: Edge[] = [];

  const nodeId = parentId ? `${parentId}-${key}` : key;

  if (depth > maxDepth) {
    nodes.push({
      id: nodeId,
      type: 'jsonNode',
      position: { x: 0, y: 0 },
      data: {
        label: key,
        type: 'primitive',
        value: '...',
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}->${nodeId}`,
        source: parentId,
        target: nodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 },
      });
    }

    return { nodes, edges };
  }

  if (json === null || json === undefined) {
    nodes.push({
      id: nodeId,
      type: 'jsonNode',
      position: { x: 0, y: 0 },
      data: {
        label: key,
        type: 'primitive',
        value: 'null',
      },
    });
  } else if (Array.isArray(json)) {
    nodes.push({
      id: nodeId,
      type: 'jsonNode',
      position: { x: 0, y: 0 },
      data: {
        label: key,
        type: 'array',
        count: json.length,
      },
    });

    // Only show first few items for arrays
    const itemsToShow = json.slice(0, 5);
    itemsToShow.forEach((item, index) => {
      const childResult = jsonToNodesAndEdges(
        item,
        nodeId,
        `[${index}]`,
        depth + 1,
        maxDepth
      );
      nodes.push(...childResult.nodes);
      edges.push(...childResult.edges);
    });

    if (json.length > 5) {
      const moreId = `${nodeId}-more`;
      nodes.push({
        id: moreId,
        type: 'jsonNode',
        position: { x: 0, y: 0 },
        data: {
          label: `... +${json.length - 5} more`,
          type: 'primitive',
        },
      });
      edges.push({
        id: `${nodeId}->${moreId}`,
        source: nodeId,
        target: moreId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 },
      });
    }
  } else if (typeof json === 'object') {
    const keys = Object.keys(json);
    nodes.push({
      id: nodeId,
      type: 'jsonNode',
      position: { x: 0, y: 0 },
      data: {
        label: key,
        type: 'object',
        count: keys.length,
      },
    });

    // Only show first few keys for objects
    const keysToShow = keys.slice(0, 8);
    keysToShow.forEach((childKey) => {
      const childResult = jsonToNodesAndEdges(
        (json as Record<string, unknown>)[childKey],
        nodeId,
        childKey,
        depth + 1,
        maxDepth
      );
      nodes.push(...childResult.nodes);
      edges.push(...childResult.edges);
    });

    if (keys.length > 8) {
      const moreId = `${nodeId}-more`;
      nodes.push({
        id: moreId,
        type: 'jsonNode',
        position: { x: 0, y: 0 },
        data: {
          label: `... +${keys.length - 8} more`,
          type: 'primitive',
        },
      });
      edges.push({
        id: `${nodeId}->${moreId}`,
        source: nodeId,
        target: moreId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 },
      });
    }
  } else {
    // Primitive value
    let displayValue = String(json);
    if (displayValue.length > 30) {
      displayValue = displayValue.substring(0, 27) + '...';
    }

    nodes.push({
      id: nodeId,
      type: 'jsonNode',
      position: { x: 0, y: 0 },
      data: {
        label: key,
        type: 'primitive',
        value: displayValue,
      },
    });
  }

  // Add edge from parent
  if (parentId) {
    edges.push({
      id: `${parentId}->${nodeId}`,
      source: parentId,
      target: nodeId,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 },
    });
  }

  return { nodes, edges };
}

export function JsonDiagram({ content, className }: JsonDiagramProps) {
  const { initialNodes, initialEdges, parseError } = useMemo(() => {
    try {
      const json = JSON.parse(content);
      const { nodes, edges } = jsonToNodesAndEdges(json);
      const layouted = getLayoutedElements(nodes, edges);
      return {
        initialNodes: layouted.nodes,
        initialEdges: layouted.edges,
        parseError: null,
      };
    } catch (e) {
      return {
        initialNodes: [],
        initialEdges: [],
        parseError: e instanceof Error ? e.message : 'Invalid JSON',
      };
    }
  }, [content]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (parseError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full text-destructive',
          className
        )}
      >
        <div className="text-center">
          <p className="font-medium">JSON Parse Error</p>
          <p className="text-sm text-muted-foreground mt-1">{parseError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
        }}
      >
        <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="bg-background border rounded-lg shadow-sm"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as JsonNodeData;
            if (data.type === 'object') return 'hsl(217 91% 60%)';
            if (data.type === 'array') return 'hsl(142 71% 45%)';
            return 'hsl(var(--muted-foreground))';
          }}
          className="bg-background border rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
