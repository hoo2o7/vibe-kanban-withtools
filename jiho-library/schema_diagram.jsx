import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// =====================================================
// 자동 레이아웃 알고리즘
// =====================================================

// 1. 계층적 레이아웃 (Dagre 스타일)
const calculateHierarchicalLayout = (entities, cardWidth = 280, cardHeight = 300, gap = { x: 100, y: 80 }) => {
  const entityMap = new Map(entities.map(e => [e.name, e]));
  
  // 관계 그래프 구축
  const children = new Map();
  const parents = new Map();
  
  entities.forEach(e => {
    children.set(e.name, []);
    parents.set(e.name, []);
  });

  // FK 관계 파싱
  entities.forEach(entity => {
    for (const attr of entity.attributes) {
      if (attr.isFK && attr.references && entityMap.has(attr.references)) {
        children.get(attr.references).push(entity.name);
        parents.get(entity.name).push(attr.references);
      }
    }
  });

  // 레벨 할당 (BFS)
  const levels = new Map();
  const visited = new Set();
  
  // 루트 찾기 (부모가 없는 노드)
  const roots = entities.filter(e => parents.get(e.name).length === 0).map(e => e.name);
  
  if (roots.length === 0) roots.push(entities[0].name);
  
  let queue = roots.map(r => ({ name: r, level: 0 }));
  
  while (queue.length > 0) {
    const { name, level } = queue.shift();
    
    if (visited.has(name)) continue;
    visited.add(name);
    levels.set(name, level);
    
    for (const child of children.get(name) || []) {
      if (!visited.has(child)) {
        queue.push({ name: child, level: level + 1 });
      }
    }
  }

  // 방문하지 않은 노드 처리
  entities.forEach(e => {
    if (!levels.has(e.name)) {
      levels.set(e.name, 0);
    }
  });

  // 레벨별 그룹화
  const levelGroups = new Map();
  levels.forEach((level, name) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level).push(name);
  });

  // 위치 계산
  const positions = {};
  
  levelGroups.forEach((nodes, level) => {
    nodes.forEach((nodeName, idx) => {
      positions[nodeName] = {
        x: 50 + idx * (cardWidth + gap.x),
        y: 50 + level * (cardHeight + gap.y)
      };
    });
  });

  return positions;
};

// 2. 그리드 레이아웃
const calculateGridLayout = (entities, cardWidth = 280, cardHeight = 300, columns = 4, gap = { x: 60, y: 60 }) => {
  const positions = {};
  
  entities.forEach((entity, idx) => {
    const row = Math.floor(idx / columns);
    const col = idx % columns;
    
    positions[entity.name] = {
      x: 50 + col * (cardWidth + gap.x),
      y: 50 + row * (cardHeight + gap.y)
    };
  });

  return positions;
};

// 3. 클러스터 레이아웃
const calculateClusterLayout = (entities, cardWidth = 280, cardHeight = 250, gap = { x: 80, y: 60 }) => {
  const clusters = {
    'User & Auth': ['User', 'Wallet', 'Payment', 'WithdrawalRequest'],
    'Content': ['Story', 'Episode', 'EpisodeContent', 'Credit'],
    'Engagement': ['Proposal', 'Backing', 'Escrow', 'Transaction'],
    'Moderation': ['Report', 'Sanction']
  };

  const assigned = new Set(Object.values(clusters).flat());
  const unassigned = entities.filter(e => !assigned.has(e.name)).map(e => e.name);
  if (unassigned.length > 0) {
    clusters['Other'] = unassigned;
  }

  const positions = {};
  let clusterX = 50;
  const clusterGap = 150;
  const entityNames = new Set(entities.map(e => e.name));

  Object.values(clusters).forEach(tableNames => {
    const clusterTables = tableNames.filter(name => entityNames.has(name));
    
    if (clusterTables.length === 0) return;

    clusterTables.forEach((tableName, idx) => {
      positions[tableName] = {
        x: clusterX,
        y: 80 + idx * (cardHeight + gap.y)
      };
    });

    clusterX += cardWidth + clusterGap;
  });

  return positions;
};

// JSON 스키마 데이터
const schemaData = {
  entities: [
    {
      name: "User",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "email", type: "String", required: true },
        { name: "password", type: "String", required: false },
        { name: "nickname", type: "String", required: true },
        { name: "profileImageUrl", type: "String", required: false },
        { name: "creatorBio", type: "String", required: false },
        { name: "role", type: "Enum", required: true, enumValues: ["READER", "CREATOR", "ADMIN"] },
        { name: "authProvider", type: "Enum", required: true, enumValues: ["EMAIL", "KAKAO", "GOOGLE"] },
        { name: "status", type: "Enum", required: true, enumValues: ["ACTIVE", "SUSPENDED", "DELETED"] },
        { name: "isVerified", type: "Boolean", required: true },
        { name: "phone", type: "String", required: false },
        { name: "isPhoneVerified", type: "Boolean", required: true },
        { name: "consents", type: "JSON", required: true },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "updatedAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "Wallet", cardinality: "1:1" },
        { entity: "Story", cardinality: "1:N" },
        { entity: "Proposal", cardinality: "1:N" },
        { entity: "Backing", cardinality: "1:N" },
        { entity: "WithdrawalRequest", cardinality: "1:N" }
      ]
    },
    {
      name: "Wallet",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "userId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "currentBalance", type: "Integer", required: true },
        { name: "payableBalance", type: "Integer", required: true },
        { name: "withdrawableBalance", type: "Integer", required: true },
        { name: "updatedAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" },
        { entity: "Transaction", cardinality: "1:N" }
      ]
    },
    {
      name: "Transaction",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "walletId", type: "UUID", required: true, isFK: true, references: "Wallet" },
        { name: "type", type: "Enum", required: true, enumValues: ["CHARGE", "USE_PROPOSAL", "USE_BACKING", "USE_DIRECT", "REFUND", "SETTLEMENT", "WITHDRAWAL"] },
        { name: "amount", type: "Integer", required: true },
        { name: "direction", type: "Enum", required: true, enumValues: ["IN", "OUT"] },
        { name: "referenceType", type: "Enum", required: false },
        { name: "referenceId", type: "UUID", required: false },
        { name: "description", type: "String", required: false },
        { name: "createdAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "Wallet", cardinality: "N:1" }
      ]
    },
    {
      name: "Payment",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "userId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "inkAmount", type: "Integer", required: true },
        { name: "paymentAmount", type: "Integer", required: true },
        { name: "paymentMethod", type: "Enum", required: true },
        { name: "pgTransactionId", type: "String", required: true },
        { name: "status", type: "Enum", required: true },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "completedAt", type: "DateTime", required: false }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" }
      ]
    },
    {
      name: "Story",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "creatorId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "title", type: "String", required: true },
        { name: "description", type: "String", required: false },
        { name: "thumbnailUrl", type: "String", required: false },
        { name: "totalBounty", type: "Integer", required: true },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "updatedAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" },
        { entity: "Episode", cardinality: "1:N" }
      ]
    },
    {
      name: "Episode",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "storyId", type: "UUID", required: true, isFK: true, references: "Story" },
        { name: "episodeNumber", type: "Integer", required: true },
        { name: "title", type: "String", required: true },
        { name: "status", type: "Enum", required: true, enumValues: ["OPEN", "PUBLISHED"] },
        { name: "totalBounty", type: "Integer", required: true },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "publishedAt", type: "DateTime", required: false }
      ],
      relationships: [
        { entity: "Story", cardinality: "N:1" },
        { entity: "EpisodeContent", cardinality: "1:N" },
        { entity: "Proposal", cardinality: "1:N" },
        { entity: "Backing", cardinality: "1:N" },
        { entity: "Credit", cardinality: "1:1" }
      ]
    },
    {
      name: "EpisodeContent",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "episodeId", type: "UUID", required: true, isFK: true, references: "Episode" },
        { name: "contentType", type: "Enum", required: true, enumValues: ["IMAGE", "TEXT"] },
        { name: "contentUrl", type: "String", required: false },
        { name: "textContent", type: "String", required: false },
        { name: "orderIndex", type: "Integer", required: true },
        { name: "isFinal", type: "Boolean", required: true },
        { name: "createdAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "Episode", cardinality: "N:1" }
      ]
    },
    {
      name: "Proposal",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "episodeId", type: "UUID", required: true, isFK: true, references: "Episode" },
        { name: "proposerId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "description", type: "String", required: true },
        { name: "seedMoney", type: "Integer", required: true },
        { name: "totalBounty", type: "Integer", required: true },
        { name: "backerCount", type: "Integer", required: true },
        { name: "status", type: "Enum", required: true, enumValues: ["PENDING", "DEAL", "DROP"] },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "decidedAt", type: "DateTime", required: false }
      ],
      relationships: [
        { entity: "Episode", cardinality: "N:1" },
        { entity: "User", cardinality: "N:1" },
        { entity: "Backing", cardinality: "1:N" }
      ]
    },
    {
      name: "Backing",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "backerId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "type", type: "Enum", required: true, enumValues: ["PROPOSAL_BACKING", "DIRECT_BACKING"] },
        { name: "proposalId", type: "UUID", required: false, isFK: true, references: "Proposal" },
        { name: "episodeId", type: "UUID", required: false, isFK: true, references: "Episode" },
        { name: "amount", type: "Integer", required: true },
        { name: "status", type: "Enum", required: true, enumValues: ["ESCROWED", "SETTLED", "REFUNDED"] },
        { name: "createdAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" },
        { entity: "Proposal", cardinality: "N:1" },
        { entity: "Episode", cardinality: "N:1" }
      ]
    },
    {
      name: "Credit",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "episodeId", type: "UUID", required: true, isFK: true, references: "Episode" },
        { name: "contributors", type: "JSON", required: true },
        { name: "mainProducers", type: "Array", required: true },
        { name: "createdAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "Episode", cardinality: "N:1" }
      ]
    },
    {
      name: "Escrow",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "proposalId", type: "UUID", required: true, isFK: true, references: "Proposal" },
        { name: "totalAmount", type: "Integer", required: true },
        { name: "status", type: "Enum", required: true, enumValues: ["HOLDING", "RELEASED", "REFUNDED"] },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "resolvedAt", type: "DateTime", required: false }
      ],
      relationships: [
        { entity: "Proposal", cardinality: "N:1" }
      ]
    },
    {
      name: "WithdrawalRequest",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "creatorId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "amount", type: "Integer", required: true },
        { name: "bankName", type: "String", required: true },
        { name: "accountNumber", type: "String", required: true },
        { name: "accountHolder", type: "String", required: true },
        { name: "status", type: "Enum", required: true },
        { name: "adminNote", type: "String", required: false },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "processedAt", type: "DateTime", required: false }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" }
      ]
    },
    {
      name: "Sanction",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "userId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "adminId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "reportId", type: "UUID", required: false, isFK: true, references: "Report" },
        { name: "reason", type: "String", required: true },
        { name: "type", type: "Enum", required: true },
        { name: "startAt", type: "DateTime", required: true },
        { name: "endAt", type: "DateTime", required: false },
        { name: "createdAt", type: "DateTime", required: true }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" },
        { entity: "Report", cardinality: "N:1" }
      ]
    },
    {
      name: "Report",
      attributes: [
        { name: "id", type: "UUID", required: true, isPK: true },
        { name: "reporterId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "reportedUserId", type: "UUID", required: true, isFK: true, references: "User" },
        { name: "type", type: "Enum", required: true },
        { name: "reason", type: "String", required: true },
        { name: "referenceType", type: "Enum", required: false },
        { name: "referenceId", type: "UUID", required: false },
        { name: "status", type: "Enum", required: true },
        { name: "adminId", type: "UUID", required: false, isFK: true, references: "User" },
        { name: "adminFeedback", type: "String", required: false },
        { name: "adminNote", type: "String", required: false },
        { name: "sanctionId", type: "UUID", required: false, isFK: true, references: "Sanction" },
        { name: "createdAt", type: "DateTime", required: true },
        { name: "processedAt", type: "DateTime", required: false }
      ],
      relationships: [
        { entity: "User", cardinality: "N:1" },
        { entity: "Sanction", cardinality: "1:1" }
      ]
    }
  ]
};

// 초기 테이블 위치 설정
const getInitialPositions = () => {
  const positions = {
    User: { x: 50, y: 50 },
    Wallet: { x: 350, y: 50 },
    Transaction: { x: 600, y: 50 },
    Payment: { x: 350, y: 320 },
    Story: { x: 50, y: 450 },
    Episode: { x: 350, y: 550 },
    EpisodeContent: { x: 650, y: 400 },
    Proposal: { x: 650, y: 650 },
    Backing: { x: 950, y: 550 },
    Credit: { x: 350, y: 820 },
    Escrow: { x: 950, y: 800 },
    WithdrawalRequest: { x: 50, y: 750 },
    Sanction: { x: 1200, y: 50 },
    Report: { x: 1200, y: 350 }
  };
  return positions;
};

// 타입 색상 매핑
const typeColors = {
  UUID: '#f472b6',
  String: '#4ade80',
  Integer: '#60a5fa',
  Boolean: '#fbbf24',
  DateTime: '#a78bfa',
  Enum: '#f97316',
  JSON: '#14b8a6',
  Array: '#ec4899'
};

// 아이콘 컴포넌트들
const KeyIcon = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const LinkIcon = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// 테이블 카드 컴포넌트
const TableCard = ({ entity, position, onDragStart, onDrag, onDragEnd, isSelected, onClick, zIndex }) => {
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.column-row')) return;
    e.preventDefault();
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    onDragStart(entity.name);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      onDrag(entity.name, {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, entity.name, onDrag, onDragEnd]);

  const rowHeight = 28;
  const headerHeight = 40;
  const cardWidth = 260;
  const cardHeight = headerHeight + entity.attributes.length * rowHeight + 8;

  return (
    <div
      ref={cardRef}
      onClick={() => onClick(entity.name)}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: cardWidth,
        background: '#1c1c1c',
        borderRadius: '8px',
        border: isSelected ? '2px solid #3ecf8e' : '1px solid #333',
        boxShadow: isDragging 
          ? '0 20px 40px rgba(0,0,0,0.5)' 
          : isSelected 
            ? '0 0 0 1px #3ecf8e, 0 8px 24px rgba(62, 207, 142, 0.15)'
            : '0 4px 12px rgba(0,0,0,0.3)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : zIndex,
        transition: isDragging ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 헤더 */}
      <div style={{
        height: headerHeight,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#262626',
        borderBottom: '1px solid #333'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#3ecf8e'
        }} />
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#fff',
          letterSpacing: '0.3px'
        }}>
          {entity.name}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '11px',
          color: '#666',
          background: '#333',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {entity.attributes.length}
        </span>
      </div>

      {/* 컬럼 리스트 */}
      <div style={{ padding: '4px 0' }}>
        {entity.attributes.map((attr, idx) => (
          <div
            key={attr.name}
            className="column-row"
            style={{
              height: rowHeight,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#ccc',
              cursor: 'default',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#262626'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {/* PK/FK 아이콘 */}
            <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
              {attr.isPK && <KeyIcon className="" style={{ color: '#fbbf24' }} />}
              {attr.isFK && !attr.isPK && <LinkIcon className="" style={{ color: '#60a5fa' }} />}
            </div>

            {/* 컬럼명 */}
            <span style={{
              flex: 1,
              color: attr.isPK ? '#fbbf24' : attr.isFK ? '#60a5fa' : '#e5e5e5',
              fontWeight: attr.isPK ? '600' : '400',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {attr.name}
            </span>

            {/* 타입 */}
            <span style={{
              fontSize: '10px',
              color: typeColors[attr.type] || '#888',
              background: `${typeColors[attr.type]}15` || '#33333350',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {attr.type}
            </span>

            {/* Nullable 표시 */}
            {!attr.required && (
              <span style={{
                fontSize: '9px',
                color: '#666',
                fontStyle: 'italic'
              }}>
                null
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 관계선 컴포넌트
const RelationshipLines = ({ entities, positions, selectedTable }) => {
  const lines = useMemo(() => {
    const result = [];
    const cardWidth = 260;
    const headerHeight = 40;
    const rowHeight = 28;

    entities.forEach(entity => {
      entity.attributes.forEach((attr, attrIdx) => {
        if (attr.isFK && attr.references) {
          const fromPos = positions[entity.name];
          const toPos = positions[attr.references];
          
          if (!fromPos || !toPos) return;

          // FK 컬럼의 Y 위치 계산
          const fromY = fromPos.y + headerHeight + (attrIdx * rowHeight) + rowHeight / 2;
          
          // 참조 테이블의 PK(첫 번째 컬럼) Y 위치
          const toY = toPos.y + headerHeight + rowHeight / 2;

          // 연결 방향 결정
          let fromX, toX;
          const fromCenterX = fromPos.x + cardWidth / 2;
          const toCenterX = toPos.x + cardWidth / 2;

          if (fromCenterX < toCenterX) {
            fromX = fromPos.x + cardWidth;
            toX = toPos.x;
          } else {
            fromX = fromPos.x;
            toX = toPos.x + cardWidth;
          }

          const isHighlighted = selectedTable === entity.name || selectedTable === attr.references;

          result.push({
            id: `${entity.name}-${attr.name}-${attr.references}`,
            fromX,
            fromY,
            toX,
            toY,
            fromTable: entity.name,
            toTable: attr.references,
            isHighlighted
          });
        }
      });
    });

    return result;
  }, [entities, positions, selectedTable]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible'
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#3ecf8e" />
        </marker>
        <marker
          id="arrowhead-dim"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#444" />
        </marker>
        <marker
          id="circle-start"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
        >
          <circle cx="4" cy="4" r="3" fill="none" stroke="#3ecf8e" strokeWidth="1.5" />
        </marker>
        <marker
          id="circle-start-dim"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
        >
          <circle cx="4" cy="4" r="3" fill="none" stroke="#444" strokeWidth="1.5" />
        </marker>
      </defs>

      {lines.map(line => {
        const midX = (line.fromX + line.toX) / 2;
        const controlOffset = Math.min(Math.abs(line.toX - line.fromX) * 0.5, 80);
        
        // 부드러운 곡선 경로
        const path = `M ${line.fromX} ${line.fromY} 
                      C ${line.fromX + (line.toX > line.fromX ? controlOffset : -controlOffset)} ${line.fromY},
                        ${line.toX + (line.toX > line.fromX ? -controlOffset : controlOffset)} ${line.toY},
                        ${line.toX} ${line.toY}`;

        return (
          <g key={line.id}>
            <path
              d={path}
              fill="none"
              stroke={line.isHighlighted ? '#3ecf8e' : '#444'}
              strokeWidth={line.isHighlighted ? 2 : 1}
              markerEnd={line.isHighlighted ? 'url(#arrowhead)' : 'url(#arrowhead-dim)'}
              markerStart={line.isHighlighted ? 'url(#circle-start)' : 'url(#circle-start-dim)'}
              style={{
                transition: 'stroke 0.2s, stroke-width 0.2s'
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

// 미니맵 컴포넌트
const Minimap = ({ positions, entities, viewportRef, canvasSize, selectedTable }) => {
  const scale = 0.08;
  const minimapWidth = 180;
  const minimapHeight = 120;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: minimapWidth,
      height: minimapHeight,
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px',
      overflow: 'hidden',
      zIndex: 100
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}>
        {entities.map(entity => {
          const pos = positions[entity.name];
          if (!pos) return null;
          return (
            <div
              key={entity.name}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: 260,
                height: 40 + entity.attributes.length * 28,
                background: selectedTable === entity.name ? '#3ecf8e' : '#333',
                borderRadius: '4px',
                opacity: selectedTable === entity.name ? 1 : 0.6
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// 메인 컴포넌트
export default function SchemaDiagram() {
  const [positions, setPositions] = useState(getInitialPositions);
  const [selectedTable, setSelectedTable] = useState(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [layoutType, setLayoutType] = useState('manual');
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // 자동 레이아웃 적용 함수
  const applyLayout = useCallback((type) => {
    setIsAnimating(true);
    setLayoutType(type);
    setIsLayoutMenuOpen(false);
    
    let newPositions;
    
    switch (type) {
      case 'hierarchical':
        newPositions = calculateHierarchicalLayout(schemaData.entities);
        break;
      case 'grid':
        newPositions = calculateGridLayout(schemaData.entities);
        break;
      case 'cluster':
        newPositions = calculateClusterLayout(schemaData.entities);
        break;
      default:
        newPositions = getInitialPositions();
    }
    
    // 부드러운 애니메이션으로 위치 이동
    const startPositions = { ...positions };
    const duration = 400;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const interpolatedPositions = {};
      Object.keys(newPositions).forEach(key => {
        if (startPositions[key]) {
          interpolatedPositions[key] = {
            x: startPositions[key].x + (newPositions[key].x - startPositions[key].x) * easeProgress,
            y: startPositions[key].y + (newPositions[key].y - startPositions[key].y) * easeProgress
          };
        } else {
          interpolatedPositions[key] = newPositions[key];
        }
      });
      
      setPositions(interpolatedPositions);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setPan({ x: 0, y: 0 });
        setZoom(0.8);
      }
    };
    
    requestAnimationFrame(animate);
  }, [positions]);

  const handleDragStart = useCallback((tableName) => {
    setDraggingTable(tableName);
    setSelectedTable(tableName);
  }, []);

  const handleDrag = useCallback((tableName, newPos) => {
    setPositions(prev => ({
      ...prev,
      [tableName]: {
        x: Math.max(0, (newPos.x - pan.x) / zoom),
        y: Math.max(0, (newPos.y - pan.y) / zoom)
      }
    }));
  }, [pan, zoom]);

  const handleDragEnd = useCallback(() => {
    setDraggingTable(null);
  }, []);

  const handleTableClick = useCallback((tableName) => {
    setSelectedTable(prev => prev === tableName ? null : tableName);
  }, []);

  // 캔버스 패닝
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e) => {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart]);

  // 줌
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 2));
    }
  }, []);

  // 레이아웃 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isLayoutMenuOpen && !e.target.closest('[data-layout-menu]')) {
        setIsLayoutMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayoutMenuOpen]);

  // 선택된 테이블 정보
  const selectedEntity = useMemo(() => {
    return schemaData.entities.find(e => e.name === selectedTable);
  }, [selectedTable]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d0d0d',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
      onWheel={handleWheel}
    >
      {/* 헤더 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: '#171717',
        borderBottom: '1px solid #262626',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 100,
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #3ecf8e 0%, #2da56c 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff'
            }}>
              Schema Visualizer
            </h1>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#666'
            }}>
              쟈근친구들 V2 (Conture)
            </p>
          </div>
        </div>

        {/* 자동 레이아웃 메뉴 */}
        <div style={{ position: 'relative' }} data-layout-menu>
          <button
            onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: isLayoutMenuOpen ? '#3ecf8e' : '#262626',
              border: 'none',
              borderRadius: '6px',
              color: isLayoutMenuOpen ? '#000' : '#ccc',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Auto Layout
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{
                transform: isLayoutMenuOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s'
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          
          {/* 드롭다운 메뉴 */}
          {isLayoutMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              width: '240px',
              background: '#1c1c1c',
              border: '1px solid #333',
              borderRadius: '8px',
              overflow: 'hidden',
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                fontSize: '10px',
                fontWeight: '600',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Layout Options
              </div>
              
              {[
                { 
                  id: 'hierarchical', 
                  name: 'Hierarchical', 
                  desc: 'FK 관계 기반 계층 구조',
                  icon: '🏛️'
                },
                { 
                  id: 'cluster', 
                  name: 'Cluster', 
                  desc: '도메인별 그룹화',
                  icon: '🎯'
                },
                { 
                  id: 'grid', 
                  name: 'Grid', 
                  desc: '균일한 그리드 배치',
                  icon: '⊞'
                },
                { 
                  id: 'manual', 
                  name: 'Reset to Default', 
                  desc: '수동 배치 초기화',
                  icon: '↺'
                }
              ].map(layout => (
                <button
                  key={layout.id}
                  onClick={() => applyLayout(layout.id)}
                  disabled={isAnimating}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: layoutType === layout.id ? 'rgba(62, 207, 142, 0.1)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #262626',
                    color: '#e5e5e5',
                    cursor: isAnimating ? 'wait' : 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.15s',
                    opacity: isAnimating ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isAnimating) e.currentTarget.style.background = 'rgba(62, 207, 142, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (layoutType !== layout.id) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{layout.icon}</span>
                  <div>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '500',
                      color: layoutType === layout.id ? '#3ecf8e' : '#e5e5e5'
                    }}>
                      {layout.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {layout.desc}
                    </div>
                  </div>
                  {layoutType === layout.id && (
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#3ecf8e" 
                      strokeWidth="2"
                      style={{ marginLeft: 'auto' }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 줌 컨트롤 */}
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#262626',
          padding: '4px 8px',
          borderRadius: '6px'
        }}>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.3))}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px'
            }}
          >
            −
          </button>
          <span style={{
            color: '#888',
            fontSize: '12px',
            minWidth: '50px',
            textAlign: 'center'
          }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px'
            }}
          >
            +
          </button>
        </div>

        {/* 테이블 카운트 */}
        <div style={{
          padding: '6px 12px',
          background: '#262626',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#888'
        }}>
          <span style={{ color: '#3ecf8e', fontWeight: '600' }}>{schemaData.entities.length}</span> tables
        </div>
      </div>

      {/* 캔버스 */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        style={{
          position: 'absolute',
          top: '56px',
          left: 0,
          right: 0,
          bottom: 0,
          cursor: isPanning ? 'grabbing' : 'default',
          overflow: 'hidden'
        }}
      >
        {/* 그리드 배경 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '200%',
          height: '200%',
          backgroundImage: `
            linear-gradient(#1a1a1a 1px, transparent 1px),
            linear-gradient(90deg, #1a1a1a 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          opacity: 0.5
        }} />

        {/* 변환 컨테이너 */}
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'relative',
          width: '3000px',
          height: '2000px'
        }}>
          {/* 관계선 */}
          <RelationshipLines
            entities={schemaData.entities}
            positions={positions}
            selectedTable={selectedTable}
          />

          {/* 테이블 카드들 */}
          {schemaData.entities.map((entity, idx) => (
            <TableCard
              key={entity.name}
              entity={entity}
              position={positions[entity.name]}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              isSelected={selectedTable === entity.name}
              onClick={handleTableClick}
              zIndex={draggingTable === entity.name ? 1000 : selectedTable === entity.name ? 100 : idx}
            />
          ))}
        </div>
      </div>

      {/* 사이드 패널 - 선택된 테이블 정보 */}
      {selectedEntity && (
        <div style={{
          position: 'fixed',
          top: '56px',
          right: 0,
          width: '320px',
          height: 'calc(100vh - 56px)',
          background: '#171717',
          borderLeft: '1px solid #262626',
          overflow: 'auto',
          zIndex: 99
        }}>
          <div style={{ padding: '20px' }}>
            {/* 헤더 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#3ecf8e'
                }} />
                <h2 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#fff'
                }}>
                  {selectedEntity.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* 컬럼 섹션 */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                Columns ({selectedEntity.attributes.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedEntity.attributes.map(attr => (
                  <div
                    key={attr.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: '#1c1c1c',
                      borderRadius: '6px',
                      borderLeft: attr.isPK 
                        ? '3px solid #fbbf24' 
                        : attr.isFK 
                          ? '3px solid #60a5fa' 
                          : '3px solid transparent'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: attr.isPK ? '#fbbf24' : attr.isFK ? '#60a5fa' : '#e5e5e5',
                        marginBottom: '2px'
                      }}>
                        {attr.name}
                        {attr.isPK && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#fbbf24' }}>PK</span>}
                        {attr.isFK && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#60a5fa' }}>FK</span>}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#666'
                      }}>
                        {attr.type}
                        {attr.isFK && attr.references && (
                          <span style={{ color: '#60a5fa' }}> → {attr.references}</span>
                        )}
                        {!attr.required && <span style={{ color: '#666' }}> (nullable)</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 관계 섹션 */}
            {selectedEntity.relationships && selectedEntity.relationships.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '12px'
                }}>
                  Relationships ({selectedEntity.relationships.length})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedEntity.relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedTable(rel.entity)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#1c1c1c',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#262626'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#1c1c1c'}
                    >
                      <span style={{ fontSize: '13px', color: '#e5e5e5' }}>
                        {rel.entity}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#3ecf8e',
                        background: 'rgba(62, 207, 142, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
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

      {/* 미니맵 */}
      <Minimap
        positions={positions}
        entities={schemaData.entities}
        viewportRef={containerRef}
        canvasSize={{ width: 3000, height: 2000 }}
        selectedTable={selectedTable}
      />

      {/* 범례 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: '#171717',
        border: '1px solid #262626',
        borderRadius: '8px',
        padding: '12px 16px',
        zIndex: 100
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: '600',
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px'
        }}>
          Legend
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyIcon style={{ color: '#fbbf24', width: '14px', height: '14px' }} />
            <span style={{ fontSize: '11px', color: '#888' }}>Primary Key</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon style={{ color: '#60a5fa', width: '14px', height: '14px' }} />
            <span style={{ fontSize: '11px', color: '#888' }}>Foreign Key</span>
          </div>
        </div>
      </div>

      {/* 단축키 힌트 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#171717',
        border: '1px solid #262626',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '11px',
        color: '#666',
        zIndex: 100,
        display: 'flex',
        gap: '16px'
      }}>
        <span><kbd style={{ background: '#262626', padding: '2px 6px', borderRadius: '3px', marginRight: '4px' }}>Ctrl</kbd> + Scroll to zoom</span>
        <span>Drag canvas to pan</span>
        <span>Drag tables to move</span>
        <span style={{ color: '#3ecf8e' }}>Auto Layout 버튼으로 자동 배치</span>
      </div>

      {/* 애니메이션 중 로딩 인디케이터 */}
      {isAnimating && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(23, 23, 23, 0.95)',
          padding: '24px 36px',
          borderRadius: '12px',
          border: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          zIndex: 2000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #333',
            borderTopColor: '#3ecf8e',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite'
          }} />
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
            Calculating layout...
          </span>
          <span style={{ color: '#666', fontSize: '12px' }}>
            테이블을 최적 위치로 배치 중
          </span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}