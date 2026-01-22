import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, Key, Link2, X, Minus, Plus } from 'lucide-react';

interface ConceptualModelViewerProps {
  content: string;
  className?: string;
}

// Data types
interface Attribute {
  name: string;
  type: string;
  required: boolean;
  isPK?: boolean;
  isFK?: boolean;
  references?: string;
  enumValues?: string[];
}

interface Relationship {
  entity: string;
  cardinality: string;
}

interface Entity {
  name: string;
  description?: string;
  attributes: Attribute[];
  relationships?: Relationship[];
}

interface DomainRule {
  id: string;
  name: string;
  description: string;
  entities: string[];
}

interface DataFlow {
  name: string;
  steps: string[];
  entities: string[];
}

interface GlossaryItem {
  term: string;
  definition: string;
}

interface ConceptualModelData {
  version?: string;
  project?: {
    name: string;
    description?: string;
  };
  entities: Entity[];
  domainRules?: DomainRule[];
  dataFlows?: DataFlow[];
  glossary?: GlossaryItem[];
}

// Entity colors - dynamic assignment
const entityColorPalette = [
  { bg: 'hsl(217 91% 60% / 0.15)', border: 'hsl(217 91% 60% / 0.4)', text: 'hsl(217 91% 70%)' },
  { bg: 'hsl(142 71% 45% / 0.15)', border: 'hsl(142 71% 45% / 0.4)', text: 'hsl(142 71% 60%)' },
  { bg: 'hsl(25 82% 54% / 0.15)', border: 'hsl(25 82% 54% / 0.4)', text: 'hsl(25 82% 65%)' },
  { bg: 'hsl(280 65% 60% / 0.15)', border: 'hsl(280 65% 60% / 0.4)', text: 'hsl(280 65% 70%)' },
  { bg: 'hsl(350 80% 60% / 0.15)', border: 'hsl(350 80% 60% / 0.4)', text: 'hsl(350 80% 70%)' },
  { bg: 'hsl(45 93% 47% / 0.15)', border: 'hsl(45 93% 47% / 0.4)', text: 'hsl(45 93% 60%)' },
  { bg: 'hsl(180 70% 45% / 0.15)', border: 'hsl(180 70% 45% / 0.4)', text: 'hsl(180 70% 60%)' },
  { bg: 'hsl(320 70% 55% / 0.15)', border: 'hsl(320 70% 55% / 0.4)', text: 'hsl(320 70% 65%)' },
];

const typeColors: Record<string, string> = {
  UUID: 'hsl(350 80% 65%)',
  String: 'hsl(142 71% 55%)',
  Integer: 'hsl(217 91% 65%)',
  Boolean: 'hsl(45 93% 55%)',
  DateTime: 'hsl(280 65% 65%)',
  Enum: 'hsl(25 82% 60%)',
  JSON: 'hsl(180 70% 50%)',
  Array: 'hsl(320 70% 60%)',
};

// =====================================================
// Schema Diagram Tab (ERD)
// =====================================================

interface TableCardProps {
  entity: Entity;
  position: { x: number; y: number };
  isSelected: boolean;
  colorIndex: number;
  onSelect: () => void;
  onDrag: (pos: { x: number; y: number }) => void;
  zoom: number;
}

function TableCard({
  entity,
  position,
  isSelected,
  colorIndex,
  onSelect,
  onDrag,
  zoom,
}: TableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.column-row')) return;
    if ((e.target as HTMLElement).closest('.expand-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPosition({ x: position.x, y: position.y });
    setIsDragging(true);
    onSelect();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      
      onDrag({
        x: Math.max(0, startPosition.x + dx),
        y: Math.max(0, startPosition.y + dy),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, startPosition, onDrag, zoom]);

  const safeColorIndex = Number.isFinite(colorIndex) ? colorIndex : 0;
  const colors =
    entityColorPalette[safeColorIndex % entityColorPalette.length] ??
    entityColorPalette[0];
  const maxVisibleAttrs = 8;
  const hasMore = entity.attributes.length > maxVisibleAttrs;
  const visibleAttrs = isExpanded ? entity.attributes : entity.attributes.slice(0, maxVisibleAttrs);

  return (
    <div
      ref={cardRef}
      // Ensure selection works even when click doesn't start drag
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onSelect();
      }}
      onMouseDown={handleMouseDown}
      className={cn(
        'absolute w-[240px] rounded border bg-secondary overflow-hidden select-none',
        isDragging ? 'cursor-grabbing z-[1000] shadow-lg' : 'cursor-grab',
        isSelected && 'ring-1 ring-brand'
      )}
      style={{
        left: position.x,
        top: position.y,
        borderColor: isSelected ? 'hsl(var(--brand))' : colors.border,
      }}
    >
      {/* Header */}
      <div
        className="h-9 px-3 flex items-center gap-2 border-b border-border"
        style={{ backgroundColor: colors.bg }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: colors.text }}
        />
        <span className="text-sm font-medium text-high">{entity.name}</span>
        <span className="ml-auto text-xs text-low bg-panel px-1.5 py-0.5 rounded">
          {entity.attributes.length}
        </span>
      </div>

      {/* Columns */}
      <div className="py-1">
        {visibleAttrs.map((attr) => (
          <div
            key={attr.name}
            className="column-row h-6 px-3 flex items-center gap-2 text-xs hover:bg-panel/50 cursor-default"
          >
            <div className="w-4 flex justify-center">
              {attr.isPK && <Key className="w-3 h-3 text-warning" />}
              {attr.isFK && !attr.isPK && (
                <Link2 className="w-3 h-3 text-info" />
              )}
            </div>
            <span
              className={cn(
                'flex-1 truncate',
                attr.isPK
                  ? 'text-warning font-medium'
                  : attr.isFK
                    ? 'text-info'
                    : 'text-normal'
              )}
            >
              {attr.name}
            </span>
            <span
              className="text-xs px-1 py-0.5 rounded font-ibm-plex-mono"
              style={{
                color: typeColors[attr.type] || 'hsl(var(--text-low))',
                backgroundColor: `${typeColors[attr.type] || 'hsl(var(--text-low))'}15`,
              }}
            >
              {attr.type}
            </span>
          </div>
        ))}
        {hasMore && (
          <button
            className="expand-btn h-6 px-3 w-full flex items-center text-xs text-brand hover:bg-panel/50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3 h-3 mr-1 rotate-180" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                +{entity.attributes.length - maxVisibleAttrs} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function RelationshipLines({
  entities,
  positions,
  selectedEntity,
}: {
  entities: Entity[];
  positions: Record<string, { x: number; y: number }>;
  selectedEntity: string | null;
}) {
  const lines = useMemo(() => {
    const result: Array<{
      id: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      isHighlighted: boolean;
      cardinality: string;
    }> = [];

    const cardWidth = 240;
    const headerHeight = 36;
    const rowHeight = 24;
    const addedPairs = new Set<string>();

    // First, add lines from FK attributes
    entities.forEach((entity) => {
      entity.attributes.forEach((attr, attrIdx) => {
        if (attr.isFK && attr.references && positions[attr.references]) {
          const fromPos = positions[entity.name];
          const toPos = positions[attr.references];

          if (!fromPos || !toPos) return;

          const pairKey = [entity.name, attr.references].sort().join('-');
          addedPairs.add(pairKey);

          const fromY = fromPos.y + headerHeight + Math.min(attrIdx, 7) * rowHeight + rowHeight / 2;
          const toY = toPos.y + headerHeight + rowHeight / 2;

          const fromCenterX = fromPos.x + cardWidth / 2;
          const toCenterX = toPos.x + cardWidth / 2;

          const fromX = fromCenterX < toCenterX ? fromPos.x + cardWidth : fromPos.x;
          const toX = fromCenterX < toCenterX ? toPos.x : toPos.x + cardWidth;

          const isHighlighted =
            selectedEntity === entity.name || selectedEntity === attr.references;

          result.push({
            id: `fk-${entity.name}-${attr.name}-${attr.references}`,
            fromX,
            fromY,
            toX,
            toY,
            isHighlighted,
            cardinality: 'N:1',
          });
        }
      });
    });

    // Then, add lines from entity-level relationships (if not already added via FK)
    entities.forEach((entity) => {
      entity.relationships?.forEach((rel) => {
        if (!positions[rel.entity]) return;
        
        const pairKey = [entity.name, rel.entity].sort().join('-');
        if (addedPairs.has(pairKey)) return; // Skip if already added via FK
        addedPairs.add(pairKey);

        const fromPos = positions[entity.name];
        const toPos = positions[rel.entity];

        if (!fromPos || !toPos) return;

        // Connect from center of cards
        const fromY = fromPos.y + headerHeight + 20;
        const toY = toPos.y + headerHeight + 20;

        const fromCenterX = fromPos.x + cardWidth / 2;
        const toCenterX = toPos.x + cardWidth / 2;

        const fromX = fromCenterX < toCenterX ? fromPos.x + cardWidth : fromPos.x;
        const toX = fromCenterX < toCenterX ? toPos.x : toPos.x + cardWidth;

        const isHighlighted =
          selectedEntity === entity.name || selectedEntity === rel.entity;

        result.push({
          id: `rel-${entity.name}-${rel.entity}`,
          fromX,
          fromY,
          toX,
          toY,
          isHighlighted,
          cardinality: rel.cardinality,
        });
      });
    });

    return result;
  }, [entities, positions, selectedEntity]);

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
      <defs>
        <marker
          id="arrowhead-active"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
        </marker>
        <marker
          id="arrowhead-dim"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--border))" />
        </marker>
        <marker
          id="circle-start-active"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
        >
          <circle cx="4" cy="4" r="3" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
        </marker>
        <marker
          id="circle-start-dim"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
        >
          <circle cx="4" cy="4" r="3" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
        </marker>
      </defs>

      {lines.map((line) => {
        const dx = line.toX - line.fromX;
        const controlOffset = Math.min(Math.abs(dx) * 0.5, 100);
        
        const path = `M ${line.fromX} ${line.fromY} 
                      C ${line.fromX + (dx > 0 ? controlOffset : -controlOffset)} ${line.fromY},
                        ${line.toX + (dx > 0 ? -controlOffset : controlOffset)} ${line.toY},
                        ${line.toX} ${line.toY}`;

        return (
          <g key={line.id}>
            <path
              d={path}
              fill="none"
              stroke={line.isHighlighted ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}
              strokeWidth={line.isHighlighted ? 2 : 1}
              markerEnd={line.isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead-dim)'}
              markerStart={line.isHighlighted ? 'url(#circle-start-active)' : 'url(#circle-start-dim)'}
            />
            {/* Cardinality label */}
            <text
              x={(line.fromX + line.toX) / 2 + 10}
              y={(line.fromY + line.toY) / 2 - 8}
              fill={line.isHighlighted ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
              fontSize="10"
              fontFamily="monospace"
            >
              {line.cardinality}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SchemaTab({
  data,
  selectedEntity,
  setSelectedEntity,
}: {
  data: ConceptualModelData;
  selectedEntity: string | null;
  setSelectedEntity: (name: string | null) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize positions
  useEffect(() => {
    const cols = 4;
    const cardWidth = 280;
    const cardHeight = 280;
    const gap = { x: 80, y: 60 };

    const newPositions: Record<string, { x: number; y: number }> = {};
    data.entities.forEach((entity, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      newPositions[entity.name] = {
        x: 50 + col * (cardWidth + gap.x),
        y: 50 + row * (cardHeight + gap.y),
      };
    });
    setPositions(newPositions);
  }, [data.entities]);

  const entityColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.entities.forEach((e, i) => {
      map[e.name] = i;
    });
    return map;
  }, [data.entities]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    };
    const handleMouseUp = () => setIsPanning(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart]);

  // Zoom: attach a non-passive wheel listener to avoid
  // "Unable to preventDefault inside passive event listener invocation."
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((prev) => Math.min(Math.max(prev * delta, 0.3), 2));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const selectedEntityData = data.entities.find((e) => e.name === selectedEntity);
  const selectedEntityColorIndex =
    selectedEntityData && Object.prototype.hasOwnProperty.call(entityColorMap, selectedEntityData.name)
      ? entityColorMap[selectedEntityData.name]
      : 0;
  const selectedEntityColors =
    entityColorPalette[selectedEntityColorIndex % entityColorPalette.length] ??
    entityColorPalette[0];

  return (
    <div className="flex h-full min-w-0">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 min-w-0 relative overflow-hidden"
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        {/* Grid background */}
        <div
          className="canvas-bg absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Transform container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: '3000px',
            height: '2000px',
          }}
        >
          <RelationshipLines
            entities={data.entities}
            positions={positions}
            selectedEntity={selectedEntity}
          />

          {data.entities.map((entity) =>
            positions[entity.name] ? (
              <TableCard
                key={entity.name}
                entity={entity}
                position={positions[entity.name]}
                isSelected={selectedEntity === entity.name}
                colorIndex={entityColorMap[entity.name] ?? 0}
                onSelect={() => setSelectedEntity(entity.name)}
                onDrag={(pos) =>
                  setPositions((prev) => ({ ...prev, [entity.name]: pos }))
                }
                zoom={zoom}
              />
            ) : null
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-secondary border rounded px-2 py-1">
          <button
            onClick={() => setZoom((p) => Math.max(p - 0.1, 0.3))}
            className="p-1 text-low hover:text-normal"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs text-low min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((p) => Math.min(p + 0.1, 2))}
            className="p-1 text-low hover:text-normal"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-secondary border rounded p-2.5 text-xs">
          <div className="text-low font-medium mb-1.5">Legend</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Key className="w-3 h-3 text-warning" />
              <span className="text-low">Primary Key</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-3 h-3 text-info" />
              <span className="text-low">Foreign Key</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selectedEntityData && (
        <div className="w-72 border-l bg-secondary/50 overflow-auto">
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: selectedEntityColors.text,
                  }}
                />
                <h3 className="text-sm font-semibold text-high">{selectedEntityData.name}</h3>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1 text-low hover:text-normal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedEntityData.description && (
              <p className="text-xs text-low mb-3">{selectedEntityData.description}</p>
            )}

            {/* Attributes */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-low uppercase tracking-wider mb-2">
                Attributes ({selectedEntityData.attributes.length})
              </h4>
              <div className="space-y-1">
                {selectedEntityData.attributes.map((attr) => (
                  <div
                    key={attr.name}
                    className={cn(
                      'px-2 py-1.5 rounded text-xs bg-panel',
                      attr.isPK && 'border-l-2 border-l-warning',
                      attr.isFK && !attr.isPK && 'border-l-2 border-l-info'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'font-medium',
                          attr.isPK ? 'text-warning' : attr.isFK ? 'text-info' : 'text-normal'
                        )}
                      >
                        {attr.name}
                      </span>
                      <span
                        className="font-ibm-plex-mono"
                        style={{ color: typeColors[attr.type] || 'hsl(var(--text-low))' }}
                      >
                        {attr.type}
                      </span>
                    </div>
                    {attr.isFK && attr.references && (
                      <div className="text-info/70 mt-0.5">→ {attr.references}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Relationships */}
            {selectedEntityData.relationships && selectedEntityData.relationships.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-low uppercase tracking-wider mb-2">
                  Relationships ({selectedEntityData.relationships.length})
                </h4>
                <div className="space-y-1">
                  {selectedEntityData.relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedEntity(rel.entity)}
                      className="px-2 py-1.5 rounded bg-panel cursor-pointer hover:bg-panel/80 flex items-center justify-between"
                    >
                      <span className="text-xs text-normal">{rel.entity}</span>
                      <span className="text-xs text-brand font-ibm-plex-mono bg-brand/10 px-1.5 py-0.5 rounded">
                        {rel.cardinality}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Data Flows Tab
// =====================================================

function DataFlowsTab({ data }: { data: ConceptualModelData }) {
  const [selectedFlow, setSelectedFlow] = useState<number | null>(null);

  const flows = data.dataFlows || [];

  const entityColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.entities.forEach((e, i) => {
      map[e.name] = i;
    });
    return map;
  }, [data.entities]);

  if (flows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-low">
        No data flows defined
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Flow list */}
      <div className="w-72 border-r overflow-auto p-3">
        <h3 className="text-xs font-medium text-low uppercase tracking-wider mb-3">
          Data Flows ({flows.length})
        </h3>
        {flows.map((flow, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedFlow(selectedFlow === idx ? null : idx)}
            className={cn(
              'p-3 mb-2 rounded cursor-pointer border transition-colors',
              selectedFlow === idx
                ? 'bg-brand/10 border-brand/30'
                : 'bg-secondary border-transparent hover:border-border'
            )}
          >
            <div className="text-sm font-medium text-high mb-1">{flow.name}</div>
            <div className="text-xs text-low">
              {flow.steps.length} steps · {flow.entities.length} entities
            </div>
          </div>
        ))}
      </div>

      {/* Flow detail */}
      <div className="flex-1 overflow-auto p-4">
        {selectedFlow !== null ? (
          <div>
            <h2 className="text-lg font-semibold text-high mb-2">
              {flows[selectedFlow].name}
            </h2>

            {/* Related entities */}
            <div className="flex gap-1.5 mb-6 flex-wrap">
              {flows[selectedFlow].entities.map((entity) => {
                const colorIdx = entityColorMap[entity] ?? 0;
                const colors = entityColorPalette[colorIdx % entityColorPalette.length];
                return (
                  <span
                    key={entity}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {entity}
                  </span>
                );
              })}
            </div>

            {/* Steps timeline */}
            <div className="relative">
              {flows[selectedFlow].steps.map((step, idx) => (
                <div key={idx} className="flex items-start mb-4 relative">
                  {/* Connector line */}
                  {idx < flows[selectedFlow].steps.length - 1 && (
                    <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%+4px)] bg-gradient-to-b from-brand/30 to-info/30" />
                  )}

                  {/* Step number */}
                  <div className="w-10 h-10 rounded-full bg-brand/10 border-2 border-brand/30 flex items-center justify-center text-sm font-semibold text-brand shrink-0 mr-3">
                    {idx + 1}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 p-3 bg-secondary rounded border-l-2 border-l-brand/50">
                    <p className="text-sm text-normal">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-low">
            ← Select a flow to view details
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Domain Rules Tab
// =====================================================

function DomainRulesTab({ data }: { data: ConceptualModelData }) {
  const rules = data.domainRules || [];

  const entityColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.entities.forEach((e, i) => {
      map[e.name] = i;
    });
    return map;
  }, [data.entities]);

  if (rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-low">
        No domain rules defined
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-4 bg-secondary rounded border border-border hover:border-border/80 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 bg-foreground/10 text-foreground text-xs font-medium font-ibm-plex-mono rounded">
                {rule.id}
              </span>
              <h3 className="text-sm font-medium text-high">{rule.name}</h3>
            </div>

            <p className="text-xs text-low mb-3 leading-relaxed">{rule.description}</p>

            <div className="flex gap-1 flex-wrap">
              {rule.entities.map((entity) => {
                const colorIdx = entityColorMap[entity] ?? 0;
                const colors = entityColorPalette[colorIdx % entityColorPalette.length];
                return (
                  <span
                    key={entity}
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {entity}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Glossary Tab
// =====================================================

function GlossaryTab({ data }: { data: ConceptualModelData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const glossary = useMemo(() => data.glossary ?? [], [data.glossary]);

  const filtered = useMemo(() => {
    if (!searchTerm) return glossary;
    const lower = searchTerm.toLowerCase();
    return glossary.filter(
      (item) =>
        item.term.toLowerCase().includes(lower) ||
        item.definition.toLowerCase().includes(lower)
    );
  }, [glossary, searchTerm]);

  if (glossary.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-low">
        No glossary defined
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full">
      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-low" />
        <input
          type="text"
          placeholder="Search terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border rounded focus:outline-none focus:ring-1 focus:ring-brand text-normal placeholder:text-low"
        />
      </div>

      {/* Terms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="p-3 bg-secondary rounded border border-border"
          >
            <div className="text-sm font-semibold text-brand mb-1">{item.term}</div>
            <p className="text-xs text-low leading-relaxed">{item.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

type TabType = 'schema' | 'flows' | 'rules' | 'glossary';

export function ConceptualModelViewer({
  content,
  className,
}: ConceptualModelViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schema');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const { data, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as ConceptualModelData;
      if (!parsed.entities || !Array.isArray(parsed.entities)) {
        return {
          data: null,
          parseError: 'Invalid conceptual model format: missing entities array',
        };
      }
      return { data: parsed, parseError: null };
    } catch (e) {
      return {
        data: null,
        parseError: e instanceof Error ? e.message : 'Invalid JSON',
      };
    }
  }, [content]);

  if (parseError || !data) {
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

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'schema', label: 'ERD', icon: '◈' },
    { id: 'flows', label: 'Data Flows', icon: '→' },
    { id: 'rules', label: 'Rules', icon: '⚙' },
    { id: 'glossary', label: 'Glossary', icon: '📖' },
  ];

  return (
    <div className={cn('h-full w-full flex flex-col', className)}>
      {/* Header */}
      <header className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-high">
              {data.project?.name || 'Conceptual Model'}
            </h1>
            {data.project?.description && (
              <p className="text-xs text-low mt-0.5 max-w-xl truncate">
                {data.project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-low">
              <span className="text-brand font-medium">{data.entities.length}</span> entities
            </span>
            {data.version && (
              <span className="text-xs text-low font-ibm-plex-mono bg-panel px-1.5 py-0.5 rounded">
                v{data.version}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-1 px-4 py-2 border-b border-border bg-secondary/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5',
              activeTab === tab.id
                ? 'bg-foreground text-background'
                : 'text-low hover:text-normal hover:bg-secondary'
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'schema' && (
          <SchemaTab
            data={data}
            selectedEntity={selectedEntity}
            setSelectedEntity={setSelectedEntity}
          />
        )}
        {activeTab === 'flows' && <DataFlowsTab data={data} />}
        {activeTab === 'rules' && <DomainRulesTab data={data} />}
        {activeTab === 'glossary' && <GlossaryTab data={data} />}
      </main>
    </div>
  );
}
