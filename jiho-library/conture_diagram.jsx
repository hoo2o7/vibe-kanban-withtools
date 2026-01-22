import React, { useState, useMemo, useCallback } from 'react';

// 전체 JSON 데이터
const schemaData = {
  "version": "1.0.0",
  "project": {
    "name": "쟈근친구들 V2 (Conture)",
    "description": "작가가 스토리 초안(콘티)을 올리면, 팬들이 창작에 참여하고 기여를 크레딧으로 인정받는 참여형 플랫폼"
  },
  "entities": [
    {
      "name": "User",
      "description": "플랫폼을 사용하는 모든 사용자 (독자, 작가, 관리자)",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "email", "type": "String", "required": true },
        { "name": "password", "type": "String", "required": false },
        { "name": "nickname", "type": "String", "required": true },
        { "name": "profileImageUrl", "type": "String", "required": false },
        { "name": "creatorBio", "type": "String", "required": false },
        { "name": "role", "type": "Enum", "required": true, "enumValues": ["READER", "CREATOR", "ADMIN"] },
        { "name": "authProvider", "type": "Enum", "required": true, "enumValues": ["EMAIL", "KAKAO", "GOOGLE"] },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["ACTIVE", "SUSPENDED", "DELETED"] },
        { "name": "isVerified", "type": "Boolean", "required": true },
        { "name": "phone", "type": "String", "required": false },
        { "name": "isPhoneVerified", "type": "Boolean", "required": true },
        { "name": "consents", "type": "JSON", "required": true },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "updatedAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "Wallet", "cardinality": "1:1" },
        { "entity": "Story", "cardinality": "1:N" },
        { "entity": "Proposal", "cardinality": "1:N" },
        { "entity": "Backing", "cardinality": "1:N" },
        { "entity": "WithdrawalRequest", "cardinality": "1:N" }
      ]
    },
    {
      "name": "Wallet",
      "description": "사용자의 Ink 재화를 관리하는 지갑",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "userId", "type": "UUID", "required": true },
        { "name": "currentBalance", "type": "Integer", "required": true },
        { "name": "payableBalance", "type": "Integer", "required": true },
        { "name": "withdrawableBalance", "type": "Integer", "required": true },
        { "name": "updatedAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" },
        { "entity": "Transaction", "cardinality": "1:N" }
      ]
    },
    {
      "name": "Transaction",
      "description": "Ink 재화의 모든 흐름을 기록하는 불변 로그",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "walletId", "type": "UUID", "required": true },
        { "name": "type", "type": "Enum", "required": true, "enumValues": ["CHARGE", "USE_PROPOSAL", "USE_BACKING", "USE_DIRECT", "REFUND", "SETTLEMENT", "WITHDRAWAL"] },
        { "name": "amount", "type": "Integer", "required": true },
        { "name": "direction", "type": "Enum", "required": true, "enumValues": ["IN", "OUT"] },
        { "name": "referenceType", "type": "Enum", "required": false, "enumValues": ["PAYMENT", "PROPOSAL", "BACKING", "EPISODE", "WITHDRAWAL_REQUEST"] },
        { "name": "referenceId", "type": "UUID", "required": false },
        { "name": "description", "type": "String", "required": false },
        { "name": "createdAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "Wallet", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Payment",
      "description": "실제 화폐로 Ink를 구매한 결제 내역",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "userId", "type": "UUID", "required": true },
        { "name": "inkAmount", "type": "Integer", "required": true },
        { "name": "paymentAmount", "type": "Integer", "required": true },
        { "name": "paymentMethod", "type": "Enum", "required": true, "enumValues": ["CARD", "BANK_TRANSFER", "VIRTUAL_ACCOUNT", "TOSS", "KAKAO_PAY", "PAYPLE"] },
        { "name": "pgTransactionId", "type": "String", "required": true },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["PENDING", "COMPLETED", "FAILED", "CANCELLED"] },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "completedAt", "type": "DateTime", "required": false }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Story",
      "description": "작가가 연재하는 작품 (웹툰/웹소설)",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "creatorId", "type": "UUID", "required": true },
        { "name": "title", "type": "String", "required": true },
        { "name": "description", "type": "String", "required": false },
        { "name": "thumbnailUrl", "type": "String", "required": false },
        { "name": "totalBounty", "type": "Integer", "required": true },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "updatedAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" },
        { "entity": "Episode", "cardinality": "1:N" }
      ]
    },
    {
      "name": "Episode",
      "description": "작품의 개별 회차 (콘티 또는 완성본)",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "storyId", "type": "UUID", "required": true },
        { "name": "episodeNumber", "type": "Integer", "required": true },
        { "name": "title", "type": "String", "required": true },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["OPEN", "PUBLISHED"] },
        { "name": "totalBounty", "type": "Integer", "required": true },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "publishedAt", "type": "DateTime", "required": false }
      ],
      "relationships": [
        { "entity": "Story", "cardinality": "N:1" },
        { "entity": "EpisodeContent", "cardinality": "1:N" },
        { "entity": "Proposal", "cardinality": "1:N" },
        { "entity": "Backing", "cardinality": "1:N" },
        { "entity": "Credit", "cardinality": "1:1" }
      ]
    },
    {
      "name": "EpisodeContent",
      "description": "에피소드를 구성하는 개별 콘텐츠 (이미지/텍스트)",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "episodeId", "type": "UUID", "required": true },
        { "name": "contentType", "type": "Enum", "required": true, "enumValues": ["IMAGE", "TEXT"] },
        { "name": "contentUrl", "type": "String", "required": false },
        { "name": "textContent", "type": "String", "required": false },
        { "name": "orderIndex", "type": "Integer", "required": true },
        { "name": "isFinal", "type": "Boolean", "required": true },
        { "name": "createdAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "Episode", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Proposal",
      "description": "독자가 스토리 전개에 개입하기 위해 생성한 제안",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "episodeId", "type": "UUID", "required": true },
        { "name": "proposerId", "type": "UUID", "required": true },
        { "name": "description", "type": "String", "required": true },
        { "name": "seedMoney", "type": "Integer", "required": true },
        { "name": "totalBounty", "type": "Integer", "required": true },
        { "name": "backerCount", "type": "Integer", "required": true },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["PENDING", "DEAL", "DROP"] },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "decidedAt", "type": "DateTime", "required": false }
      ],
      "relationships": [
        { "entity": "Episode", "cardinality": "N:1" },
        { "entity": "User", "cardinality": "N:1" },
        { "entity": "Backing", "cardinality": "1:N" }
      ]
    },
    {
      "name": "Backing",
      "description": "독자가 제안에 지지(Backer)하거나 직접 후원(Sponsor)한 기록",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "backerId", "type": "UUID", "required": true },
        { "name": "type", "type": "Enum", "required": true, "enumValues": ["PROPOSAL_BACKING", "DIRECT_BACKING"] },
        { "name": "proposalId", "type": "UUID", "required": false },
        { "name": "episodeId", "type": "UUID", "required": false },
        { "name": "amount", "type": "Integer", "required": true },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["ESCROWED", "SETTLED", "REFUNDED"] },
        { "name": "createdAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" },
        { "entity": "Proposal", "cardinality": "N:1" },
        { "entity": "Episode", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Credit",
      "description": "완성된 에피소드 하단에 표시되는 기여자 크레딧 데이터",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "episodeId", "type": "UUID", "required": true },
        { "name": "contributors", "type": "JSON", "required": true },
        { "name": "mainProducers", "type": "Array[UUID]", "required": true },
        { "name": "createdAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "Episode", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Escrow",
      "description": "제안/지지 시 시스템이 보관하는 에스크로 계정",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "proposalId", "type": "UUID", "required": true },
        { "name": "totalAmount", "type": "Integer", "required": true },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["HOLDING", "RELEASED", "REFUNDED"] },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "resolvedAt", "type": "DateTime", "required": false }
      ],
      "relationships": [
        { "entity": "Proposal", "cardinality": "N:1" }
      ]
    },
    {
      "name": "WithdrawalRequest",
      "description": "작가가 출금 가능 금액을 실제 계좌로 출금 요청한 내역",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "creatorId", "type": "UUID", "required": true },
        { "name": "amount", "type": "Integer", "required": true },
        { "name": "bankName", "type": "String", "required": true },
        { "name": "accountNumber", "type": "String", "required": true },
        { "name": "accountHolder", "type": "String", "required": true },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["PENDING", "APPROVED", "REJECTED", "COMPLETED"] },
        { "name": "adminNote", "type": "String", "required": false },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "processedAt", "type": "DateTime", "required": false }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Sanction",
      "description": "관리자가 악성 유저에게 부과한 제재 기록",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "userId", "type": "UUID", "required": true },
        { "name": "adminId", "type": "UUID", "required": true },
        { "name": "reportId", "type": "UUID", "required": false },
        { "name": "reason", "type": "String", "required": true },
        { "name": "type", "type": "Enum", "required": true, "enumValues": ["WARNING", "SUSPENSION", "PERMANENT_BAN"] },
        { "name": "startAt", "type": "DateTime", "required": true },
        { "name": "endAt", "type": "DateTime", "required": false },
        { "name": "createdAt", "type": "DateTime", "required": true }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" },
        { "entity": "Report", "cardinality": "N:1" }
      ]
    },
    {
      "name": "Report",
      "description": "사용자가 다른 사용자를 신고한 기록",
      "attributes": [
        { "name": "id", "type": "UUID", "required": true },
        { "name": "reporterId", "type": "UUID", "required": true },
        { "name": "reportedUserId", "type": "UUID", "required": true },
        { "name": "type", "type": "Enum", "required": true, "enumValues": ["SPAM", "ABUSE", "INAPPROPRIATE_CONTENT", "COPYRIGHT", "MISINFORMATION", "OTHER"] },
        { "name": "reason", "type": "String", "required": true },
        { "name": "referenceType", "type": "Enum", "required": false, "enumValues": ["STORY", "PROPOSAL", "BACKING", "COMMENT", "PROFILE"] },
        { "name": "referenceId", "type": "UUID", "required": false },
        { "name": "status", "type": "Enum", "required": true, "enumValues": ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"] },
        { "name": "adminId", "type": "UUID", "required": false },
        { "name": "adminFeedback", "type": "String", "required": false },
        { "name": "adminNote", "type": "String", "required": false },
        { "name": "sanctionId", "type": "UUID", "required": false },
        { "name": "createdAt", "type": "DateTime", "required": true },
        { "name": "processedAt", "type": "DateTime", "required": false }
      ],
      "relationships": [
        { "entity": "User", "cardinality": "N:1" },
        { "entity": "Sanction", "cardinality": "1:1" }
      ]
    }
  ],
  "domainRules": [
    { "id": "DR-001", "name": "닉네임 고유성", "description": "닉네임은 플랫폼 전체에서 중복될 수 없음", "entities": ["User"] },
    { "id": "DR-002", "name": "최소 제안 금액", "description": "제안 생성 시 최소 100 Ink 이상 베팅해야 함", "entities": ["Proposal"] },
    { "id": "DR-003", "name": "잔액 초과 사용 불가", "description": "제안/지지/후원 시 보유 Ink보다 많은 금액 사용 불가", "entities": ["Wallet", "Proposal", "Backing"] },
    { "id": "DR-004", "name": "에스크로 보관", "description": "제안/지지 시 Ink는 시스템 에스크로에 보관", "entities": ["Proposal", "Backing", "Escrow"] },
    { "id": "DR-005", "name": "Drop 시 전액 환불", "description": "제안이 Drop되면 모든 Backer에게 100% 환불", "entities": ["Proposal", "Backing", "Escrow"] },
    { "id": "DR-006", "name": "Deal 시 정산 이관", "description": "제안이 Deal되면 에스크로 금액이 작가에게 이동", "entities": ["Proposal", "Wallet", "Escrow"] },
    { "id": "DR-007", "name": "직접 후원 즉시 정산", "description": "직접 후원은 에스크로 없이 즉시 정산", "entities": ["Backing", "Wallet"] },
    { "id": "DR-008", "name": "최종 원고 업로드 시 정산 전환", "description": "완성 원고 업로드 시 출금 가능 금액으로 전환", "entities": ["Episode", "Wallet"] },
    { "id": "DR-009", "name": "크레딧 영구 박제", "description": "에피소드 공개 시 크레딧은 변경 불가", "entities": ["Credit", "Episode"] },
    { "id": "DR-010", "name": "크레딧 정렬 규칙", "description": "제안자 우선, 금액순 정렬", "entities": ["Credit"] },
    { "id": "DR-011", "name": "출금 가능 금액 초과 불가", "description": "출금 요청은 가능 금액 이하만", "entities": ["WithdrawalRequest", "Wallet"] },
    { "id": "DR-012", "name": "OPEN 상태에서만 제안/후원 가능", "description": "에피소드가 OPEN일 때만 참여 가능", "entities": ["Episode", "Proposal", "Backing"] }
  ],
  "dataFlows": [
    {
      "name": "독자 회원가입 및 Ink 충전",
      "steps": ["User 생성", "Wallet 자동 생성", "Payment 생성", "Transaction 생성", "Wallet.currentBalance 증가"],
      "entities": ["User", "Wallet", "Payment", "Transaction"]
    },
    {
      "name": "제안 생성",
      "steps": ["Episode.status = OPEN 확인", "잔액 확인", "Proposal 생성", "Escrow 생성", "Backing 생성", "Transaction 생성", "잔액 감소"],
      "entities": ["Episode", "Wallet", "Proposal", "Escrow", "Backing", "Transaction"]
    },
    {
      "name": "제안 지지",
      "steps": ["Proposal.status = PENDING 확인", "잔액 확인", "Backing 생성", "Escrow 증가", "Proposal.totalBounty 증가", "Transaction 생성", "잔액 감소"],
      "entities": ["Proposal", "Wallet", "Backing", "Escrow", "Transaction"]
    },
    {
      "name": "직접 후원",
      "steps": ["Episode.status = OPEN 확인", "잔액 확인", "Backing 생성", "Transaction 생성", "독자 잔액 감소", "작가 정산금 증가"],
      "entities": ["Episode", "Wallet", "Backing", "Transaction"]
    },
    {
      "name": "Deal (채택)",
      "steps": ["Proposal.status → DEAL", "Escrow 해제", "Backing 정산", "작가 정산금 증가", "Transaction 생성"],
      "entities": ["Proposal", "Escrow", "Backing", "Wallet", "Transaction"]
    },
    {
      "name": "Drop (거절)",
      "steps": ["Proposal.status → DROP", "Escrow 환불", "Backing 환불", "Backer 잔액 복구", "Transaction 생성"],
      "entities": ["Proposal", "Escrow", "Backing", "Wallet", "Transaction"]
    },
    {
      "name": "완성 원고 공개",
      "steps": ["EpisodeContent 생성", "Episode.status → PUBLISHED", "Credit 생성", "정산금 → 출금 가능금"],
      "entities": ["Episode", "EpisodeContent", "Credit", "Wallet"]
    },
    {
      "name": "출금 요청",
      "steps": ["출금 가능 금액 확인", "WithdrawalRequest 생성", "관리자 검토", "승인/거절", "이체 완료", "잔액 감소"],
      "entities": ["Wallet", "WithdrawalRequest", "Transaction"]
    }
  ],
  "glossary": [
    { "term": "Ink", "definition": "플랫폼 내 유료 재화. 1 Ink = 100원" },
    { "term": "콘티", "definition": "작가가 업로드하는 스토리 초안" },
    { "term": "Proposal", "definition": "독자가 Ink를 걸고 생성하는 스토리 제안" },
    { "term": "Backing", "definition": "제안에 Ink를 추가하여 지지하는 행위" },
    { "term": "Sponsor", "definition": "제안 없이 순수하게 후원하는 방식" },
    { "term": "Bounty", "definition": "제안에 모인 총 금액" },
    { "term": "Escrow", "definition": "시스템이 Ink를 임시 보관하는 계정" },
    { "term": "Deal", "definition": "작가가 제안을 채택하는 것" },
    { "term": "Drop", "definition": "작가가 제안을 거절하는 것" },
    { "term": "Credit", "definition": "완성 에피소드의 기여자 명단" },
    { "term": "Main Producer", "definition": "기여 상위 3인 특별 타이틀" }
  ]
};

// 엔티티 색상 매핑
const entityColors = {
  User: { bg: '#1e3a5f', border: '#3d7ab8', text: '#a8d5ff' },
  Wallet: { bg: '#2d4a3e', border: '#4a9970', text: '#a8e6cf' },
  Transaction: { bg: '#3d3a2e', border: '#8a8050', text: '#e8e4b8' },
  Payment: { bg: '#4a2d4a', border: '#8a508a', text: '#e8b8e8' },
  Story: { bg: '#4a3d2d', border: '#b8884a', text: '#ffe4b8' },
  Episode: { bg: '#5a2d3d', border: '#b84a6a', text: '#ffb8c8' },
  EpisodeContent: { bg: '#4a2d2d', border: '#a85050', text: '#ffb8b8' },
  Proposal: { bg: '#2d4a4a', border: '#50a8a8', text: '#b8ffff' },
  Backing: { bg: '#3d2d4a', border: '#7050a8', text: '#d8b8ff' },
  Credit: { bg: '#4a4a2d', border: '#a8a850', text: '#fffab8' },
  Escrow: { bg: '#2d3d4a', border: '#5080a8', text: '#b8d8ff' },
  WithdrawalRequest: { bg: '#4a3d3d', border: '#a87070', text: '#ffd0d0' },
  Sanction: { bg: '#5a2d2d', border: '#c85050', text: '#ffb0b0' },
  Report: { bg: '#3d3d4a', border: '#7070a8', text: '#d0d0ff' }
};

// 엔티티 노드 컴포넌트
const EntityNode = ({ entity, isSelected, onClick, position, isHighlighted }) => {
  const colors = entityColors[entity.name] || { bg: '#333', border: '#666', text: '#fff' };
  
  return (
    <g 
      transform={`translate(${position.x}, ${position.y})`}
      onClick={() => onClick(entity)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={-80}
        y={-30}
        width={160}
        height={60}
        rx={12}
        fill={colors.bg}
        stroke={isSelected ? '#fff' : isHighlighted ? colors.border : colors.border}
        strokeWidth={isSelected ? 3 : isHighlighted ? 2 : 1}
        style={{
          filter: isSelected ? 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' : 
                  isHighlighted ? 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' : 'none',
          transition: 'all 0.3s ease'
        }}
      />
      <text
        x={0}
        y={-5}
        textAnchor="middle"
        fill={colors.text}
        fontSize={14}
        fontWeight="600"
        fontFamily="'Pretendard', 'Noto Sans KR', sans-serif"
      >
        {entity.name}
      </text>
      <text
        x={0}
        y={12}
        textAnchor="middle"
        fill={colors.text}
        fontSize={10}
        opacity={0.7}
        fontFamily="'Pretendard', 'Noto Sans KR', sans-serif"
      >
        {entity.attributes?.length || 0} attrs
      </text>
    </g>
  );
};

// 관계 선 컴포넌트
const RelationshipLine = ({ from, to, cardinality, isHighlighted }) => {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  // 베지어 커브를 위한 제어점
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3;
  
  const path = `M ${from.x} ${from.y} Q ${midX + offset} ${midY - offset} ${to.x} ${to.y}`;
  
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? '#888' : '#444'}
        strokeWidth={isHighlighted ? 2 : 1}
        strokeDasharray={cardinality?.includes('N') ? '5,3' : 'none'}
        style={{ transition: 'all 0.3s ease' }}
        markerEnd="url(#arrowhead)"
      />
      {cardinality && (
        <text
          x={midX + 10}
          y={midY - 10}
          fill={isHighlighted ? '#aaa' : '#666'}
          fontSize={9}
          fontFamily="monospace"
        >
          {cardinality}
        </text>
      )}
    </g>
  );
};

// 메인 다이어그램 컴포넌트
export default function ContureDiagram() {
  const [activeView, setActiveView] = useState('erd');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [hoveredRule, setHoveredRule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 엔티티 위치 계산 (원형 배치)
  const entityPositions = useMemo(() => {
    const positions = {};
    const entities = schemaData.entities;
    const centerX = 450;
    const centerY = 320;
    const radius = 280;
    
    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI - Math.PI / 2;
      positions[entity.name] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    
    return positions;
  }, []);

  // 선택된 엔티티와 연관된 엔티티 찾기
  const relatedEntities = useMemo(() => {
    if (!selectedEntity) return new Set();
    const related = new Set();
    
    selectedEntity.relationships?.forEach(rel => {
      related.add(rel.entity);
    });
    
    schemaData.entities.forEach(entity => {
      entity.relationships?.forEach(rel => {
        if (rel.entity === selectedEntity.name) {
          related.add(entity.name);
        }
      });
    });
    
    return related;
  }, [selectedEntity]);

  // 검색 필터링
  const filteredGlossary = useMemo(() => {
    if (!searchTerm) return schemaData.glossary;
    return schemaData.glossary.filter(item =>
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleEntityClick = useCallback((entity) => {
    setSelectedEntity(prev => prev?.name === entity.name ? null : entity);
  }, []);

  // 타입별 아이콘
  const getTypeIcon = (type) => {
    switch(type) {
      case 'UUID': return '🔑';
      case 'String': return '📝';
      case 'Integer': return '🔢';
      case 'Boolean': return '☑️';
      case 'DateTime': return '📅';
      case 'Enum': return '📋';
      case 'JSON': return '{}';
      default: return '•';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
      color: '#e0e0e0',
      fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #a8d5ff 0%, #ffb8c8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {schemaData.project.name}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
              {schemaData.project.description}
            </p>
          </div>
          <div style={{
            padding: '6px 12px',
            background: 'rgba(168, 213, 255, 0.1)',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#a8d5ff'
          }}>
            v{schemaData.version}
          </div>
        </div>
      </header>

      {/* 네비게이션 탭 */}
      <nav style={{
        display: 'flex',
        gap: '4px',
        padding: '16px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {[
          { id: 'erd', label: 'ERD 다이어그램', icon: '◈' },
          { id: 'flows', label: '데이터 플로우', icon: '→' },
          { id: 'rules', label: '도메인 규칙', icon: '⚙' },
          { id: 'glossary', label: '용어 사전', icon: '📖' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeView === tab.id 
                ? 'linear-gradient(135deg, rgba(168,213,255,0.2) 0%, rgba(255,184,200,0.2) 100%)'
                : 'transparent',
              color: activeView === tab.id ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 메인 콘텐츠 */}
      <main style={{ display: 'flex', height: 'calc(100vh - 140px)' }}>
        {/* ERD 뷰 */}
        {activeView === 'erd' && (
          <>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 900 640">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                  </marker>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* 관계 선 그리기 */}
                {schemaData.entities.map(entity =>
                  entity.relationships?.map((rel, idx) => {
                    const fromPos = entityPositions[entity.name];
                    const toPos = entityPositions[rel.entity];
                    if (!fromPos || !toPos) return null;
                    
                    const isHighlighted = selectedEntity && 
                      (selectedEntity.name === entity.name || selectedEntity.name === rel.entity);
                    
                    return (
                      <RelationshipLine
                        key={`${entity.name}-${rel.entity}-${idx}`}
                        from={fromPos}
                        to={toPos}
                        cardinality={rel.cardinality}
                        isHighlighted={isHighlighted}
                      />
                    );
                  })
                )}

                {/* 엔티티 노드 그리기 */}
                {schemaData.entities.map(entity => (
                  <EntityNode
                    key={entity.name}
                    entity={entity}
                    position={entityPositions[entity.name]}
                    isSelected={selectedEntity?.name === entity.name}
                    isHighlighted={relatedEntities.has(entity.name)}
                    onClick={handleEntityClick}
                  />
                ))}
              </svg>

              {/* 범례 */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '12px'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '600', color: '#aaa' }}>범례</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '20px', height: '2px', background: '#666' }} />
                    <span style={{ color: '#888' }}>1:1</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '20px', height: '2px', background: '#666', borderStyle: 'dashed' }} />
                    <span style={{ color: '#888' }}>1:N</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 엔티티 상세 패널 */}
            <aside style={{
              width: selectedEntity ? '380px' : '0',
              background: 'rgba(0,0,0,0.4)',
              borderLeft: selectedEntity ? '1px solid rgba(255,255,255,0.08)' : 'none',
              overflow: 'hidden',
              transition: 'width 0.3s ease'
            }}>
              {selectedEntity && (
                <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '700',
                        color: entityColors[selectedEntity.name]?.text || '#fff'
                      }}>
                        {selectedEntity.name}
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
                        {selectedEntity.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEntity(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px'
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Attributes */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '12px'
                    }}>
                      Attributes ({selectedEntity.attributes?.length || 0})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedEntity.attributes?.map(attr => (
                        <div
                          key={attr.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${attr.required ? '#4a9970' : '#555'}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px' }}>{getTypeIcon(attr.type)}</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{attr.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(168,213,255,0.1)',
                              borderRadius: '4px',
                              color: '#a8d5ff'
                            }}>
                              {attr.type}
                            </span>
                            {attr.required && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'rgba(74,153,112,0.2)',
                                borderRadius: '4px',
                                color: '#a8e6cf'
                              }}>
                                required
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relationships */}
                  {selectedEntity.relationships?.length > 0 && (
                    <div>
                      <h3 style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '12px'
                      }}>
                        Relationships ({selectedEntity.relationships.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedEntity.relationships.map((rel, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              const target = schemaData.entities.find(e => e.name === rel.entity);
                              if (target) setSelectedEntity(target);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.03)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            <span style={{ fontSize: '13px' }}>→ {rel.entity}</span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: 'rgba(255,184,200,0.1)',
                              borderRadius: '4px',
                              color: '#ffb8c8',
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
              )}
            </aside>
          </>
        )}

        {/* 데이터 플로우 뷰 */}
        {activeView === 'flows' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* 플로우 리스트 */}
            <div style={{
              width: '320px',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              overflowY: 'auto',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px'
              }}>
                데이터 플로우 ({schemaData.dataFlows.length})
              </h3>
              {schemaData.dataFlows.map((flow, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedFlow(selectedFlow === idx ? null : idx)}
                  style={{
                    padding: '16px',
                    marginBottom: '8px',
                    background: selectedFlow === idx 
                      ? 'linear-gradient(135deg, rgba(168,213,255,0.1) 0%, rgba(255,184,200,0.1) 100%)'
                      : 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: selectedFlow === idx ? '1px solid rgba(168,213,255,0.3)' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>
                    {flow.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {flow.steps.length} 단계 · {flow.entities.length} 엔티티
                  </div>
                </div>
              ))}
            </div>

            {/* 플로우 상세 */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              {selectedFlow !== null ? (
                <div>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #a8d5ff 0%, #ffb8c8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {schemaData.dataFlows[selectedFlow].name}
                  </h2>
                  
                  {/* 관련 엔티티 */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
                    {schemaData.dataFlows[selectedFlow].entities.map(entity => (
                      <span
                        key={entity}
                        style={{
                          padding: '4px 12px',
                          background: entityColors[entity]?.bg || '#333',
                          color: entityColors[entity]?.text || '#fff',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {entity}
                      </span>
                    ))}
                  </div>

                  {/* 스텝 타임라인 */}
                  <div style={{ position: 'relative' }}>
                    {schemaData.dataFlows[selectedFlow].steps.map((step, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          marginBottom: '24px',
                          position: 'relative'
                        }}
                      >
                        {/* 연결선 */}
                        {idx < schemaData.dataFlows[selectedFlow].steps.length - 1 && (
                          <div style={{
                            position: 'absolute',
                            left: '19px',
                            top: '40px',
                            width: '2px',
                            height: 'calc(100% + 4px)',
                            background: 'linear-gradient(180deg, rgba(168,213,255,0.3) 0%, rgba(255,184,200,0.3) 100%)'
                          }} />
                        )}
                        
                        {/* 스텝 번호 */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(168,213,255,0.2) 0%, rgba(255,184,200,0.2) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '14px',
                          color: '#a8d5ff',
                          flexShrink: 0,
                          marginRight: '16px',
                          border: '2px solid rgba(168,213,255,0.3)'
                        }}>
                          {idx + 1}
                        </div>
                        
                        {/* 스텝 내용 */}
                        <div style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '12px',
                          borderLeft: '3px solid rgba(168,213,255,0.5)'
                        }}>
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666',
                  fontSize: '15px'
                }}>
                  ← 왼쪽에서 플로우를 선택하세요
                </div>
              )}
            </div>
          </div>
        )}

        {/* 도메인 규칙 뷰 */}
        {activeView === 'rules' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '16px'
            }}>
              {schemaData.domainRules.map((rule) => (
                <div
                  key={rule.id}
                  onMouseEnter={() => setHoveredRule(rule.id)}
                  onMouseLeave={() => setHoveredRule(null)}
                  style={{
                    padding: '20px',
                    background: hoveredRule === rule.id 
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s ease',
                    transform: hoveredRule === rule.id ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: 'rgba(168,213,255,0.1)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#a8d5ff',
                      fontFamily: 'monospace'
                    }}>
                      {rule.id}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
                      {rule.name}
                    </h3>
                  </div>
                  
                  <p style={{
                    margin: '0 0 16px',
                    fontSize: '13px',
                    color: '#aaa',
                    lineHeight: 1.6
                  }}>
                    {rule.description}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {rule.entities.map(entity => (
                      <span
                        key={entity}
                        style={{
                          padding: '3px 10px',
                          background: entityColors[entity]?.bg || '#333',
                          color: entityColors[entity]?.text || '#fff',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 용어 사전 뷰 */}
        {activeView === 'glossary' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {/* 검색 */}
            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="용어 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* 용어 목록 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '12px'
            }}>
              {filteredGlossary.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #a8d5ff 0%, #ffb8c8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {item.term}
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#aaa',
                    lineHeight: 1.6
                  }}>
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}