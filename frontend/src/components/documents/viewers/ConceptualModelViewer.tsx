import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, Key, Link2, X, Minus, Plus } from 'lucide-react';

interface ConceptualModelViewerProps {
  content: string;
  className?: string;
}

// Data types - v1 format (legacy)
interface AttributeV1 {
  name: string;
  type: string;
  required: boolean;
  isPK?: boolean;
  isFK?: boolean;
  references?: string;
  enumValues?: string[];
}

// v2 format attribute with nested references object
interface AttributeV2 {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enumValues?: string[];
  references?: {
    entity: string;
    attribute: string;
    relationshipId?: string;
    onDelete?: string;
  };
}

// Normalized attribute for internal use
interface Attribute {
  name: string;
  type: string;
  required: boolean;
  isPK?: boolean;
  isFK?: boolean;
  references?: string;
  enumValues?: string[];
  description?: string;
}

interface Relationship {
  entity: string;
  cardinality: string;
}

// v2 top-level relationship format
interface RelationshipV2 {
  from: string;
  to: string;
  cardinality: string;
  type?: string;
  optional?: { from: boolean; to: boolean };
  description?: string;
  relationshipId?: string;
  businessRule?: string;
}

interface Entity {
  name: string;
  businessName?: string;
  description?: string;
  category?: string;
  attributes: Attribute[];
  relationships?: Relationship[];
  relatedEntities?: string[];
  userStories?: string[];
}

interface DomainRule {
  id: string;
  name: string;
  description: string;
  entities: string[];
}

// v2 data flow step format
interface DataFlowStepV2 {
  order: number;
  action: string;
  entity: string;
  description: string;
}

interface DataFlow {
  name: string;
  description?: string;
  steps: string[] | DataFlowStepV2[];
  entities?: string[];
  userStories?: string[];
}

// v2 glossary format
interface GlossaryItemV2 {
  koreanTerm: string;
  englishTerm: string;
  definition: string;
}

interface GlossaryItem {
  term: string;
  definition: string;
}

interface ConceptualModelData {
  version?: string;
  format?: string;
  project?: {
    name: string;
    description?: string;
    version?: string;
    domain?: string;
  };
  summary?: {
    totalEntities: number;
    totalRelationships: number;
    entityList?: string[];
  };
  entities: Entity[];
  relationships?: RelationshipV2[];
  domainRules?: DomainRule[];
  dataFlows?: DataFlow[];
  glossary?: GlossaryItem[] | GlossaryItemV2[];
}

// Normalize v2 attributes to internal format
function normalizeAttribute(attr: AttributeV1 | AttributeV2, entityName: string): Attribute {
  const normalized: Attribute = {
    name: attr.name,
    type: attr.type,
    required: attr.required,
    enumValues: attr.enumValues,
    description: 'description' in attr ? attr.description : undefined,
  };

  // Check for PK (common pattern: 'id' field)
  if (attr.name === 'id' || attr.name === `${entityName.toLowerCase()}Id`) {
    normalized.isPK = true;
  }

  // Handle v1 format
  if ('isPK' in attr) normalized.isPK = attr.isPK;
  if ('isFK' in attr) normalized.isFK = attr.isFK;
  if (typeof attr.references === 'string') {
    normalized.references = attr.references;
    normalized.isFK = true;
  }

  // Handle v2 format - references is an object
  if (attr.references && typeof attr.references === 'object' && 'entity' in attr.references) {
    normalized.isFK = true;
    normalized.references = attr.references.entity;
  }

  return normalized;
}

// Normalize glossary items
function normalizeGlossary(glossary?: GlossaryItem[] | GlossaryItemV2[]): GlossaryItem[] {
  if (!glossary || glossary.length === 0) return [];

  return glossary.map((item) => {
    // Check if it's v2 format
    if ('koreanTerm' in item) {
      return {
        term: `${item.koreanTerm} (${item.englishTerm})`,
        definition: item.definition,
      };
    }
    return item as GlossaryItem;
  });
}

// Normalize data flow steps
function normalizeDataFlowSteps(steps: string[] | DataFlowStepV2[]): string[] {
  if (steps.length === 0) return [];

  // Check if it's v2 format (array of objects)
  if (typeof steps[0] === 'object') {
    return (steps as DataFlowStepV2[])
      .sort((a, b) => a.order - b.order)
      .map((step) => `${step.action}: ${step.description}`);
  }

  return steps as string[];
}

// Extract entities from data flow (v2 format)
function extractDataFlowEntities(steps: string[] | DataFlowStepV2[]): string[] {
  if (steps.length === 0 || typeof steps[0] !== 'object') return [];
  
  const entities = new Set<string>();
  (steps as DataFlowStepV2[]).forEach((step) => {
    entities.add(step.entity);
  });
  return Array.from(entities);
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
  topLevelRelationships,
}: {
  entities: Entity[];
  positions: Record<string, { x: number; y: number }>;
  selectedEntity: string | null;
  topLevelRelationships?: RelationshipV2[];
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

    // First, add lines from FK attributes (works for both v1 and normalized v2)
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

    // Add lines from top-level relationships (v2 format)
    if (topLevelRelationships) {
      topLevelRelationships.forEach((rel) => {
        if (!positions[rel.from] || !positions[rel.to]) return;

        const pairKey = [rel.from, rel.to].sort().join('-');
        if (addedPairs.has(pairKey)) return;
        addedPairs.add(pairKey);

        const fromPos = positions[rel.from];
        const toPos = positions[rel.to];

        const fromY = fromPos.y + headerHeight + 20;
        const toY = toPos.y + headerHeight + 20;

        const fromCenterX = fromPos.x + cardWidth / 2;
        const toCenterX = toPos.x + cardWidth / 2;

        const fromX = fromCenterX < toCenterX ? fromPos.x + cardWidth : fromPos.x;
        const toX = fromCenterX < toCenterX ? toPos.x : toPos.x + cardWidth;

        const isHighlighted = selectedEntity === rel.from || selectedEntity === rel.to;

        result.push({
          id: `rel-${rel.from}-${rel.to}`,
          fromX,
          fromY,
          toX,
          toY,
          isHighlighted,
          cardinality: rel.cardinality,
        });
      });
    }

    // Then, add lines from entity-level relationships (v1 format, if not already added)
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
  }, [entities, positions, selectedEntity, topLevelRelationships]);

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
  normalizedEntities,
  selectedEntity,
  setSelectedEntity,
}: {
  data: ConceptualModelData;
  normalizedEntities: Entity[];
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
    normalizedEntities.forEach((entity, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      newPositions[entity.name] = {
        x: 50 + col * (cardWidth + gap.x),
        y: 50 + row * (cardHeight + gap.y),
      };
    });
    setPositions(newPositions);
  }, [normalizedEntities]);

  const entityColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    normalizedEntities.forEach((e, i) => {
      map[e.name] = i;
    });
    return map;
  }, [normalizedEntities]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Start panning if clicking on canvas background, grid, or transform container (not on cards)
      const target = e.target as HTMLElement;
      const isCanvasOrBg = 
        target === canvasRef.current || 
        target.classList.contains('canvas-bg') ||
        target.classList.contains('transform-container');
      
      if (isCanvasOrBg) {
        e.preventDefault();
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

  const selectedEntityData = normalizedEntities.find((e) => e.name === selectedEntity);
  const selectedEntityColorIndex =
    selectedEntityData && Object.prototype.hasOwnProperty.call(entityColorMap, selectedEntityData.name)
      ? entityColorMap[selectedEntityData.name]
      : 0;
  const selectedEntityColors =
    entityColorPalette[selectedEntityColorIndex % entityColorPalette.length] ??
    entityColorPalette[0];

  // Build relationships for sidebar from v2 top-level relationships
  const selectedEntityRelationships = useMemo(() => {
    if (!selectedEntityData || !data.relationships) return selectedEntityData?.relationships || [];
    
    // Get relationships where this entity is the 'from' side
    const fromRels = data.relationships
      .filter((rel) => rel.from === selectedEntityData.name)
      .map((rel) => ({ entity: rel.to, cardinality: rel.cardinality }));
    
    // Get relationships where this entity is the 'to' side
    const toRels = data.relationships
      .filter((rel) => rel.to === selectedEntityData.name)
      .map((rel) => ({ entity: rel.from, cardinality: rel.cardinality }));
    
    return [...fromRels, ...toRels];
  }, [selectedEntityData, data.relationships]);

  return (
    <div className="flex h-full min-w-0">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 min-w-0 relative overflow-hidden"
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
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
          className="transform-container"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: '3000px',
            height: '2000px',
          }}
        >
          <RelationshipLines
            entities={normalizedEntities}
            positions={positions}
            selectedEntity={selectedEntity}
            topLevelRelationships={data.relationships}
          />

          {normalizedEntities.map((entity) =>
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
                <div>
                  <h3 className="text-sm font-semibold text-high">{selectedEntityData.name}</h3>
                  {selectedEntityData.businessName && (
                    <span className="text-xs text-low">{selectedEntityData.businessName}</span>
                  )}
                </div>
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

            {selectedEntityData.category && (
              <div className="mb-3">
                <span className="text-xs px-1.5 py-0.5 bg-brand/10 text-brand rounded">
                  {selectedEntityData.category}
                </span>
              </div>
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
                    {attr.description && (
                      <div className="text-low/70 mt-0.5 text-[10px]">{attr.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Relationships */}
            {selectedEntityRelationships.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-low uppercase tracking-wider mb-2">
                  Relationships ({selectedEntityRelationships.length})
                </h4>
                <div className="space-y-1">
                  {selectedEntityRelationships.map((rel, idx) => (
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

function DataFlowsTab({ data, normalizedEntities }: { data: ConceptualModelData; normalizedEntities: Entity[] }) {
  const [selectedFlow, setSelectedFlow] = useState<number | null>(null);

  const flows = data.dataFlows || [];

  const entityColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    normalizedEntities.forEach((e, i) => {
      map[e.name] = i;
    });
    return map;
  }, [normalizedEntities]);

  // Normalize flows for display
  const normalizedFlows = useMemo(() => {
    return flows.map((flow) => ({
      name: flow.name,
      description: flow.description,
      steps: normalizeDataFlowSteps(flow.steps),
      entities: flow.entities || extractDataFlowEntities(flow.steps),
    }));
  }, [flows]);

  if (normalizedFlows.length === 0) {
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
          Data Flows ({normalizedFlows.length})
        </h3>
        {normalizedFlows.map((flow, idx) => (
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
              {normalizedFlows[selectedFlow].name}
            </h2>

            {normalizedFlows[selectedFlow].description && (
              <p className="text-sm text-low mb-4">{normalizedFlows[selectedFlow].description}</p>
            )}

            {/* Related entities */}
            <div className="flex gap-1.5 mb-6 flex-wrap">
              {normalizedFlows[selectedFlow].entities.map((entity) => {
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
              {normalizedFlows[selectedFlow].steps.map((step, idx) => (
                <div key={idx} className="flex items-start mb-4 relative">
                  {/* Connector line */}
                  {idx < normalizedFlows[selectedFlow].steps.length - 1 && (
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

function DomainRulesTab({ data, normalizedEntities }: { data: ConceptualModelData; normalizedEntities: Entity[] }) {
  const rules = data.domainRules || [];

  const entityColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    normalizedEntities.forEach((e, i) => {
      map[e.name] = i;
    });
    return map;
  }, [normalizedEntities]);

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
  
  // Normalize glossary items for display
  const glossary = useMemo(() => normalizeGlossary(data.glossary), [data.glossary]);

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

  const { data, normalizedEntities, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as ConceptualModelData;
      if (!parsed.entities || !Array.isArray(parsed.entities)) {
        return {
          data: null,
          normalizedEntities: [],
          parseError: 'Invalid conceptual model format: missing entities array',
        };
      }

      // Normalize entities with attributes
      const normalized: Entity[] = parsed.entities.map((entity) => ({
        ...entity,
        attributes: entity.attributes.map((attr) => 
          normalizeAttribute(attr as AttributeV1 | AttributeV2, entity.name)
        ),
      }));

      return { data: parsed, normalizedEntities: normalized, parseError: null };
    } catch (e) {
      return {
        data: null,
        normalizedEntities: [],
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
              <span className="text-brand font-medium">{normalizedEntities.length}</span> entities
            </span>
            {data.relationships && (
              <span className="text-xs text-low">
                <span className="text-info font-medium">{data.relationships.length}</span> relationships
              </span>
            )}
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
            normalizedEntities={normalizedEntities}
            selectedEntity={selectedEntity}
            setSelectedEntity={setSelectedEntity}
          />
        )}
        {activeTab === 'flows' && <DataFlowsTab data={data} normalizedEntities={normalizedEntities} />}
        {activeTab === 'rules' && <DomainRulesTab data={data} normalizedEntities={normalizedEntities} />}
        {activeTab === 'glossary' && <GlossaryTab data={data} />}
      </main>
    </div>
  );
}
