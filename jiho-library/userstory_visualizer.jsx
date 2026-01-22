import React, { useState, useMemo } from 'react';

// 샘플 데이터
const sampleData = {
  "project": {
    "name": "쟈근친구들 V2",
    "description": "작가가 스토리 초안을 올리면, 팬들이 창작에 참여하고 기여를 크레딧으로 인정받는 참여형 플랫폼",
    "version": "2.0.0"
  },
  "actors": [
    { "id": "actor-reader", "name": "독자", "description": "작품을 탐색하고, 후원/제안을 통해 창작에 참여하는 사용자", "permissions": ["작품/에피소드 열람", "Ink 충전 및 보유", "제안 생성"], "goals": ["작품 탐색", "창작 참여"] },
    { "id": "actor-creator", "name": "작가", "description": "콘텐츠를 제작하고, 제안을 관리하며, 수익을 정산받는 창작자", "permissions": ["에피소드 업로드", "제안 관리"], "goals": ["제작비 확보", "독자 반응 수집"] },
    { "id": "actor-admin", "name": "관리자", "description": "플랫폼 운영, 정산 승인, 콘텐츠 관리를 담당하는 운영자", "permissions": ["회원 관리", "정산 승인"], "goals": ["안정적 운영", "콘텐츠 관리"] }
  ],
  "user_stories": [
    { "id": "US-001", "actor_id": "actor-reader", "story": "As a 독자, I want to 이메일 또는 소셜 계정으로 회원가입하다, So that 서비스를 이용하고 Ink를 소유할 수 있다", "priority": "P1", "domain": "인증/회원", "acceptance_criteria": ["이메일 인증 메일 발송", "OAuth 인증 페이지 리다이렉트", "프로필 설정 페이지 이동"] },
    { "id": "US-002", "actor_id": "actor-reader", "story": "As a 독자, I want to 로그인하다, So that 내 지갑과 기여 내역에 접근할 수 있다", "priority": "P1", "domain": "인증/회원", "acceptance_criteria": ["JWT 토큰 발급", "에러 메시지 표시"] },
    { "id": "US-003", "actor_id": "actor-reader", "story": "As a 독자, I want to 내 Ink 잔액을 확인하다, So that 후원/제안에 사용 가능한 금액을 알 수 있다", "priority": "P1", "domain": "지갑/재화", "acceptance_criteria": ["잔액 정보 표시", "정수 표시"] },
    { "id": "US-005", "actor_id": "actor-reader", "story": "As a 독자, I want to Ink를 충전하다, So that 후원/제안에 사용할 재화를 확보할 수 있다", "priority": "P1", "domain": "결제", "acceptance_criteria": ["금액 옵션 선택", "PG사 결제 연동"] },
    { "id": "US-006", "actor_id": "actor-reader", "story": "As a 독자, I want to 홈에서 추천/인기 작품을 확인하다, So that 관심 있는 작품을 쉽게 발견할 수 있다", "priority": "P1", "domain": "작품 탐색", "acceptance_criteria": ["배너 영역 표시", "작품 리스트 표시"] },
    { "id": "US-008", "actor_id": "actor-reader", "story": "As a 독자, I want to 에피소드 콘티를 열람하다, So that 스토리 내용을 확인하고 참여 여부를 결정할 수 있다", "priority": "P1", "domain": "에피소드 뷰어", "acceptance_criteria": ["스크롤 방식 표시", "액션 바 표시"] },
    { "id": "US-009", "actor_id": "actor-reader", "story": "As a 독자, I want to 제안을 생성하다, So that 스토리 전개에 개입하고 채택 시 크레딧에 이름을 남길 수 있다", "priority": "P1", "domain": "스토리 인터벤션", "acceptance_criteria": ["베팅액 설정", "에러 표시"] },
    { "id": "US-010", "actor_id": "actor-reader", "story": "As a 독자, I want to 다른 사람의 제안에 지지하다, So that 해당 제안의 채택 확률을 높일 수 있다", "priority": "P1", "domain": "스토리 인터벤션", "acceptance_criteria": ["지지 버튼", "실시간 업데이트"] },
    { "id": "US-014", "actor_id": "actor-creator", "story": "As a 작가, I want to 에피소드 콘티를 업로드하다, So that 팬들의 후원과 제안을 받을 수 있다", "priority": "P1", "domain": "크리에이터 스튜디오", "acceptance_criteria": ["이미지 다중 업로드", "상태 자동 변경"] },
    { "id": "US-016", "actor_id": "actor-creator", "story": "As a 작가, I want to 받은 제안 목록을 조회하다, So that 채택 여부를 결정할 수 있다", "priority": "P1", "domain": "제안 관리", "acceptance_criteria": ["모금액 순 정렬", "액션 버튼 제공"] },
    { "id": "US-017", "actor_id": "actor-creator", "story": "As a 작가, I want to 제안을 채택하다, So that Bounty를 정산 예정금으로 받을 수 있다", "priority": "P1", "domain": "제안 관리", "acceptance_criteria": ["확인 모달", "잔액 이동"] },
    { "id": "US-020", "actor_id": "actor-creator", "story": "As a 작가, I want to 정산 현황을 조회하다, So that 출금 가능 금액을 확인할 수 있다", "priority": "P1", "domain": "정산", "acceptance_criteria": ["예정 정산금 표시", "출금 가능 금액 표시"] },
    { "id": "US-022", "actor_id": "actor-admin", "story": "As a 관리자, I want to 회원 목록을 조회하다, So that 전체 회원 현황을 파악할 수 있다", "priority": "P1", "domain": "관리자 - 회원", "acceptance_criteria": ["회원 정보 표시", "검색 필터"] },
    { "id": "US-025", "actor_id": "actor-admin", "story": "As a 관리자, I want to 정산 요청 목록을 조회하다, So that 출금 요청 현황을 파악할 수 있다", "priority": "P1", "domain": "관리자 - 정산", "acceptance_criteria": ["요청 목록 표시", "상태 필터"] },
    { "id": "US-026", "actor_id": "actor-admin", "story": "As a 관리자, I want to 정산 요청을 승인하다, So that 작가에게 이체를 진행할 수 있다", "priority": "P1", "domain": "관리자 - 정산", "acceptance_criteria": ["승인 버튼", "상태 변경"] },
  ],
  "priority_levels": { "P1": "Must Have", "P2": "Should Have", "P3": "Nice to Have" },
  "domains": ["인증/회원", "지갑/재화", "결제", "작품 탐색", "에피소드 뷰어", "스토리 인터벤션", "크리에이터 스튜디오", "제안 관리", "정산", "관리자 - 회원", "관리자 - 정산"]
};

const parseStory = (story) => {
  const match = story.match(/As a (.+?), I want to (.+?), So that (.+)/);
  if (match) return { actor: match[1], action: match[2], goal: match[3] };
  const simple = story.match(/As a (.+?), I want to (.+)/);
  if (simple) return { actor: simple[1], action: simple[2], goal: null };
  return { actor: null, action: story, goal: null };
};

const ChevronIcon = ({ isOpen, className = "" }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
  </svg>
);

const StoryCard = ({ story, isExpanded, onToggle }) => {
  const parsed = parseStory(story.story);
  const priorityStyles = {
    'P1': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'P2': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'P3': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  return (
    <div className="group">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityStyles[story.priority] || priorityStyles['P1']}`}>
            {story.priority}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-zinc-500">{story.id}</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{parsed.action}</p>
          </div>
          <ChevronIcon isOpen={isExpanded} className="text-zinc-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-4 pl-4 border-l border-zinc-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2 pt-2">
            {parsed.actor && (
              <div className="flex gap-3">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 w-14 shrink-0 pt-0.5">As a</span>
                <span className="text-sm text-zinc-400">{parsed.actor}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 w-14 shrink-0 pt-0.5">I want</span>
              <span className="text-sm text-zinc-400">{parsed.action}</span>
            </div>
            {parsed.goal && (
              <div className="flex gap-3">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 w-14 shrink-0 pt-0.5">So that</span>
                <span className="text-sm text-zinc-400">{parsed.goal}</span>
              </div>
            )}
          </div>

          {story.acceptance_criteria?.length > 0 && (
            <div className="pt-2">
              <h5 className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
                Acceptance Criteria
              </h5>
              <ul className="space-y-1.5">
                {story.acceptance_criteria.map((ac, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-emerald-500/70 shrink-0">○</span>
                    <span className="text-zinc-500">{ac}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {story.related_stories?.length > 0 && (
            <div className="pt-2">
              <h5 className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Related</h5>
              <div className="flex flex-wrap gap-1">
                {story.related_stories.map(id => (
                  <span key={id} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{id}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OverviewTab = ({ data }) => {
  const [expandedDomains, setExpandedDomains] = useState({});
  const [expandedStories, setExpandedStories] = useState({});
  const [filter, setFilter] = useState('all');

  const actorData = useMemo(() => {
    const result = {};
    data.actors.forEach(a => { result[a.id] = { actor: a, domains: {} }; });
    data.user_stories.forEach(s => {
      if (result[s.actor_id]) {
        if (!result[s.actor_id].domains[s.domain]) result[s.actor_id].domains[s.domain] = [];
        result[s.actor_id].domains[s.domain].push(s);
      }
    });
    return result;
  }, [data]);

  const stats = useMemo(() => {
    const s = {};
    Object.keys(data.priority_levels || {}).forEach(p => {
      s[p] = data.user_stories.filter(st => st.priority === p).length;
    });
    return s;
  }, [data]);

  const actorColors = {
    'actor-reader': { accent: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.15)' },
    'actor-creator': { accent: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)' },
    'actor-admin': { accent: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)' },
  };

  const toggleDomain = (key) => setExpandedDomains(p => ({ ...p, [key]: !p[key] }));
  const toggleStory = (id) => setExpandedStories(p => ({ ...p, [id]: !p[id] }));
  const filterStories = (stories) => filter === 'all' ? stories : stories.filter(s => s.priority === filter);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/50">
        <span className="text-xs text-zinc-500 mr-2">Filter</span>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            filter === 'all' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All ({data.user_stories.length})
        </button>
        {Object.entries(stats).map(([p, count]) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === p ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {p} ({count})
          </button>
        ))}
      </div>

      {/* Actor Sections */}
      <div className="space-y-8">
        {Object.entries(actorData).map(([actorId, { actor, domains }]) => {
          const colors = actorColors[actorId] || actorColors['actor-reader'];
          const total = Object.values(domains).flat().length;
          const filtered = Object.values(domains).flat().filter(s => filter === 'all' || s.priority === filter).length;
          
          if (filter !== 'all' && filtered === 0) return null;

          return (
            <div key={actorId} className="space-y-3">
              {/* Actor Header */}
              <div className="flex items-center gap-3 pb-2">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: colors.accent }} />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-zinc-200">{actor.name}</h3>
                  <p className="text-xs text-zinc-500">{actor.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-light text-zinc-300">{filtered}</span>
                  {filter !== 'all' && <span className="text-xs text-zinc-600 ml-1">/ {total}</span>}
                </div>
              </div>

              {/* Domains */}
              <div className="space-y-2 ml-4">
                {Object.entries(domains).map(([domain, stories]) => {
                  const key = `${actorId}-${domain}`;
                  const isOpen = expandedDomains[key];
                  const filteredList = filterStories(stories);
                  
                  if (filter !== 'all' && filteredList.length === 0) return null;

                  return (
                    <div key={domain} className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
                      <button
                        onClick={() => toggleDomain(key)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-sm font-medium text-zinc-300">{domain}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">{filteredList.length}</span>
                          <ChevronIcon isOpen={isOpen} className="text-zinc-500" />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 space-y-2">
                          {filteredList.map(story => (
                            <StoryCard
                              key={story.id}
                              story={story}
                              isExpanded={expandedStories[story.id]}
                              onToggle={() => toggleStory(story.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const JourneyTab = ({ data }) => {
  const [selectedActor, setSelectedActor] = useState('actor-reader');
  const [expandedStories, setExpandedStories] = useState({});

  const actorColors = {
    'actor-reader': '#3b82f6',
    'actor-creator': '#10b981',
    'actor-admin': '#f59e0b',
  };

  const journey = useMemo(() => {
    const stories = data.user_stories.filter(s => s.actor_id === selectedActor);
    const order = {
      'actor-reader': ['인증/회원', '결제', '지갑/재화', '작품 탐색', '에피소드 뷰어', '스토리 인터벤션'],
      'actor-creator': ['크리에이터 스튜디오', '제안 관리', '정산'],
      'actor-admin': ['관리자 - 회원', '관리자 - 정산', '관리자 - 콘텐츠']
    };
    
    const grouped = {};
    stories.forEach(s => {
      if (!grouped[s.domain]) grouped[s.domain] = [];
      grouped[s.domain].push(s);
    });

    const ordered = (order[selectedActor] || []).filter(d => grouped[d]);
    const remaining = Object.keys(grouped).filter(d => !order[selectedActor]?.includes(d));
    
    return [...ordered, ...remaining].map(d => ({ domain: d, stories: grouped[d] }));
  }, [data, selectedActor]);

  const color = actorColors[selectedActor];
  const toggleStory = (id) => setExpandedStories(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">
      {/* Actor Selector */}
      <div className="flex gap-2 pb-4 border-b border-zinc-800/50">
        {data.actors.map(actor => {
          const isActive = selectedActor === actor.id;
          const c = actorColors[actor.id];
          return (
            <button
              key={actor.id}
              onClick={() => setSelectedActor(actor.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={isActive ? { backgroundColor: `${c}15`, border: `1px solid ${c}30` } : {}}
            >
              {actor.name}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[7px] top-4 bottom-4 w-px bg-zinc-800" />

        <div className="space-y-6">
          {journey.map(({ domain, stories }, idx) => (
            <div key={domain} className="relative pl-8">
              {/* Timeline Dot */}
              <div 
                className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-zinc-950"
                style={{ borderColor: color }}
              />

              {/* Step */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-medium text-zinc-200">{domain}</h4>
                  <span className="text-xs text-zinc-600">{stories.length} stories</span>
                </div>

                <div className="space-y-2">
                  {stories.map(story => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      isExpanded={expandedStories[story.id]}
                      onToggle={() => toggleStory(story.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function UserStoryVisualizer({ data = sampleData }) {
  const [tab, setTab] = useState('overview');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                {data.project?.name || 'User Stories'}
              </h1>
              <p className="text-sm text-zinc-500 mt-1 max-w-xl">
                {data.project?.description}
              </p>
            </div>
            {data.project?.version && (
              <span className="text-xs text-zinc-600 font-mono">v{data.project.version}</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-zinc-500">Stories</span>
              <span className="ml-2 text-zinc-300 font-medium">{data.user_stories?.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Actors</span>
              <span className="ml-2 text-zinc-300 font-medium">{data.actors?.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Domains</span>
              <span className="ml-2 text-zinc-300 font-medium">{data.domains?.length}</span>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex gap-1 mb-8 p-1 bg-zinc-900/50 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'journey', label: 'Journey' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.id 
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main>
          {tab === 'overview' && <OverviewTab data={data} />}
          {tab === 'journey' && <JourneyTab data={data} />}
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600">
            Click on any item to expand details
          </p>
        </footer>
      </div>
    </div>
  );
}