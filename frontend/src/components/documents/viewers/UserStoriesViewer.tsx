import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface UserStoriesViewerProps {
  content: string;
  className?: string;
}

interface Actor {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  goals?: string[];
}

interface UserStory {
  id: string;
  actor_id: string;
  story: string;
  priority: string;
  domain: string;
  acceptance_criteria?: string[];
  related_stories?: string[];
}

interface UserStoriesData {
  project?: {
    name: string;
    description?: string;
    version?: string;
  };
  actors: Actor[];
  user_stories: UserStory[];
  priority_levels?: Record<string, string>;
  domains?: string[];
}

const parseStory = (story: string) => {
  const match = story.match(/As a (.+?), I want to (.+?), So that (.+)/);
  if (match) return { actor: match[1], action: match[2], goal: match[3] };
  const simple = story.match(/As a (.+?), I want to (.+)/);
  if (simple) return { actor: simple[1], action: simple[2], goal: null };
  return { actor: null, action: story, goal: null };
};

function ChevronIcon({
  isOpen,
  className = '',
}: {
  isOpen: boolean;
  className?: string;
}) {
  return (
    <ChevronDown
      className={cn(
        'w-4 h-4 transition-transform duration-200',
        isOpen && 'rotate-180',
        className
      )}
    />
  );
}

function StoryCard({
  story,
  isExpanded,
  onToggle,
}: {
  story: UserStory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const parsed = parseStory(story.story);
  const priorityStyles: Record<string, string> = {
    P1: 'bg-error/10 text-error border-error/20',
    P2: 'bg-warning/10 text-warning border-warning/20',
    P3: 'bg-info/10 text-info border-info/20',
  };

  return (
    <div className="group">
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 rounded bg-secondary hover:bg-panel border border-border hover:border-border/80 transition-all duration-200"
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded border shrink-0',
              priorityStyles[story.priority] || priorityStyles['P1']
            )}
          >
            {story.priority}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-ibm-plex-mono text-low">
                {story.id}
              </span>
            </div>
            <p className="text-sm text-normal leading-relaxed">
              {parsed.action}
            </p>
          </div>
          <ChevronIcon
            isOpen={isExpanded}
            className="text-low mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-3 pl-3 border-l border-border space-y-2.5 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5 pt-1.5">
            {parsed.actor && (
              <div className="flex gap-2.5">
                <span className="text-xs uppercase tracking-wider text-low w-12 shrink-0 pt-0.5">
                  As a
                </span>
                <span className="text-sm text-normal">{parsed.actor}</span>
              </div>
            )}
            <div className="flex gap-2.5">
              <span className="text-xs uppercase tracking-wider text-low w-12 shrink-0 pt-0.5">
                I want
              </span>
              <span className="text-sm text-normal">{parsed.action}</span>
            </div>
            {parsed.goal && (
              <div className="flex gap-2.5">
                <span className="text-xs uppercase tracking-wider text-low w-12 shrink-0 pt-0.5">
                  So that
                </span>
                <span className="text-sm text-normal">{parsed.goal}</span>
              </div>
            )}
          </div>

          {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
            <div className="pt-1.5">
              <h5 className="text-xs uppercase tracking-wider text-low mb-1.5">
                Acceptance Criteria
              </h5>
              <ul className="space-y-1">
                {story.acceptance_criteria.map((ac, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-success/70 shrink-0">○</span>
                    <span className="text-low">{ac}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {story.related_stories && story.related_stories.length > 0 && (
            <div className="pt-1.5">
              <h5 className="text-xs uppercase tracking-wider text-low mb-1.5">
                Related
              </h5>
              <div className="flex flex-wrap gap-1">
                {story.related_stories.map((id) => (
                  <span
                    key={id}
                    className="text-xs px-1.5 py-0.5 rounded bg-panel text-normal"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Actor colors for visual distinction
const actorColors: Record<
  string,
  { accent: string; bg: string; border: string }
> = {
  'actor-reader': {
    accent: 'hsl(217 91% 60%)',
    bg: 'hsl(217 91% 60% / 0.08)',
    border: 'hsl(217 91% 60% / 0.15)',
  },
  'actor-creator': {
    accent: 'hsl(142 71% 45%)',
    bg: 'hsl(142 71% 45% / 0.08)',
    border: 'hsl(142 71% 45% / 0.15)',
  },
  'actor-admin': {
    accent: 'hsl(25 82% 54%)',
    bg: 'hsl(25 82% 54% / 0.08)',
    border: 'hsl(25 82% 54% / 0.15)',
  },
};

const getActorColor = (actorId: string, index: number) => {
  if (actorColors[actorId]) return actorColors[actorId];
  // Fallback colors for dynamic actors
  const fallbackColors = [
    {
      accent: 'hsl(217 91% 60%)',
      bg: 'hsl(217 91% 60% / 0.08)',
      border: 'hsl(217 91% 60% / 0.15)',
    },
    {
      accent: 'hsl(142 71% 45%)',
      bg: 'hsl(142 71% 45% / 0.08)',
      border: 'hsl(142 71% 45% / 0.15)',
    },
    {
      accent: 'hsl(25 82% 54%)',
      bg: 'hsl(25 82% 54% / 0.08)',
      border: 'hsl(25 82% 54% / 0.15)',
    },
    {
      accent: 'hsl(280 65% 60%)',
      bg: 'hsl(280 65% 60% / 0.08)',
      border: 'hsl(280 65% 60% / 0.15)',
    },
    {
      accent: 'hsl(350 80% 60%)',
      bg: 'hsl(350 80% 60% / 0.08)',
      border: 'hsl(350 80% 60% / 0.15)',
    },
  ];
  return fallbackColors[index % fallbackColors.length];
};

function OverviewTab({ data }: { data: UserStoriesData }) {
  const [expandedDomains, setExpandedDomains] = useState<
    Record<string, boolean>
  >({});
  const [expandedStories, setExpandedStories] = useState<
    Record<string, boolean>
  >({});
  const [filter, setFilter] = useState('all');

  const actorData = useMemo(() => {
    const result: Record<
      string,
      { actor: Actor; domains: Record<string, UserStory[]> }
    > = {};
    data.actors.forEach((a) => {
      result[a.id] = { actor: a, domains: {} };
    });
    data.user_stories.forEach((s) => {
      if (result[s.actor_id]) {
        if (!result[s.actor_id].domains[s.domain])
          result[s.actor_id].domains[s.domain] = [];
        result[s.actor_id].domains[s.domain].push(s);
      }
    });
    return result;
  }, [data]);

  const stats = useMemo(() => {
    const s: Record<string, number> = {};
    Object.keys(data.priority_levels || {}).forEach((p) => {
      s[p] = data.user_stories.filter((st) => st.priority === p).length;
    });
    return s;
  }, [data]);

  const toggleDomain = (key: string) =>
    setExpandedDomains((p) => ({ ...p, [key]: !p[key] }));
  const toggleStory = (id: string) =>
    setExpandedStories((p) => ({ ...p, [id]: !p[id] }));
  const filterStories = (stories: UserStory[]) =>
    filter === 'all' ? stories : stories.filter((s) => s.priority === filter);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <span className="text-xs text-low mr-2">Filter</span>
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-all',
            filter === 'all'
              ? 'bg-panel text-high'
              : 'text-low hover:text-normal'
          )}
        >
          All ({data.user_stories.length})
        </button>
        {Object.entries(stats).map(([p, count]) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-all',
              filter === p ? 'bg-panel text-high' : 'text-low hover:text-normal'
            )}
          >
            {p} ({count})
          </button>
        ))}
      </div>

      {/* Actor Sections */}
      <div className="space-y-6">
        {Object.entries(actorData).map(([actorId, { actor, domains }], idx) => {
          const colors = getActorColor(actorId, idx);
          const total = Object.values(domains).flat().length;
          const filtered = Object.values(domains)
            .flat()
            .filter((s) => filter === 'all' || s.priority === filter).length;

          if (filter !== 'all' && filtered === 0) return null;

          return (
            <div key={actorId} className="space-y-2.5">
              {/* Actor Header */}
              <div className="flex items-center gap-2.5 pb-2">
                <div
                  className="w-1 h-7 rounded-full"
                  style={{ backgroundColor: colors.accent }}
                />
                <div className="flex-1">
                  <h3 className="text-base font-medium text-high">
                    {actor.name}
                  </h3>
                  {actor.description && (
                    <p className="text-xs text-low">{actor.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-light text-normal">
                    {filtered}
                  </span>
                  {filter !== 'all' && (
                    <span className="text-xs text-low ml-1">/ {total}</span>
                  )}
                </div>
              </div>

              {/* Domains */}
              <div className="space-y-1.5 ml-3">
                {Object.entries(domains).map(([domain, stories]) => {
                  const key = `${actorId}-${domain}`;
                  const isOpen = expandedDomains[key];
                  const filteredList = filterStories(stories);

                  if (filter !== 'all' && filteredList.length === 0)
                    return null;

                  return (
                    <div
                      key={domain}
                      className="rounded overflow-hidden"
                      style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <button
                        onClick={() => toggleDomain(key)}
                        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-sm font-medium text-normal">
                          {domain}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-low">
                            {filteredList.length}
                          </span>
                          <ChevronIcon isOpen={isOpen} className="text-low" />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-2.5 pb-2.5 space-y-1.5">
                          {filteredList.map((story) => (
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
}

function JourneyTab({ data }: { data: UserStoriesData }) {
  const [selectedActor, setSelectedActor] = useState(
    data.actors[0]?.id || 'actor-reader'
  );
  const [expandedStories, setExpandedStories] = useState<
    Record<string, boolean>
  >({});

  const journey = useMemo(() => {
    const stories = data.user_stories.filter(
      (s) => s.actor_id === selectedActor
    );
    const grouped: Record<string, UserStory[]> = {};
    stories.forEach((s) => {
      if (!grouped[s.domain]) grouped[s.domain] = [];
      grouped[s.domain].push(s);
    });

    return Object.keys(grouped).map((d) => ({
      domain: d,
      stories: grouped[d],
    }));
  }, [data, selectedActor]);

  const colors = getActorColor(
    selectedActor,
    data.actors.findIndex((a) => a.id === selectedActor)
  );
  const toggleStory = (id: string) =>
    setExpandedStories((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      {/* Actor Selector */}
      <div className="flex gap-1.5 pb-3 border-b border-border">
        {data.actors.map((actor, idx) => {
          const isActive = selectedActor === actor.id;
          const c = getActorColor(actor.id, idx);
          return (
            <button
              key={actor.id}
              onClick={() => setSelectedActor(actor.id)}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-all',
                isActive ? 'text-high' : 'text-low hover:text-normal'
              )}
              style={
                isActive
                  ? { backgroundColor: c.bg, border: `1px solid ${c.border}` }
                  : {}
              }
            >
              {actor.name}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

        <div className="space-y-4">
          {journey.map(({ domain, stories }, idx) => (
            <div key={domain} className="relative pl-6">
              {/* Timeline Dot */}
              <div
                className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-primary"
                style={{ borderColor: colors.accent }}
              />

              {/* Step */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: colors.bg, color: colors.accent }}
                  >
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-medium text-high">{domain}</h4>
                  <span className="text-xs text-low">
                    {stories.length} stories
                  </span>
                </div>

                <div className="space-y-1.5">
                  {stories.map((story) => (
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
}

export function UserStoriesViewer({
  content,
  className,
}: UserStoriesViewerProps) {
  const [tab, setTab] = useState<'overview' | 'journey'>('overview');

  const { data, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as UserStoriesData;
      // Validate required fields
      if (!parsed.actors || !parsed.user_stories) {
        return {
          data: null,
          parseError: 'Invalid user stories format: missing actors or user_stories',
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

  return (
    <div className={cn('h-full w-full flex flex-col', className)}>
      {/* Header */}
      <header className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-lg font-semibold text-high">
              {data.project?.name || 'User Stories'}
            </h1>
            {data.project?.description && (
              <p className="text-xs text-low mt-0.5 max-w-xl">
                {data.project.description}
              </p>
            )}
          </div>
          {data.project?.version && (
            <span className="text-xs text-low font-ibm-plex-mono">
              v{data.project.version}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-low">Stories</span>
            <span className="ml-1.5 text-normal font-medium">
              {data.user_stories?.length}
            </span>
          </div>
          <div>
            <span className="text-low">Actors</span>
            <span className="ml-1.5 text-normal font-medium">
              {data.actors?.length}
            </span>
          </div>
          <div>
            <span className="text-low">Domains</span>
            <span className="ml-1.5 text-normal font-medium">
              {data.domains?.length ||
                new Set(data.user_stories.map((s) => s.domain)).size}
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-1 px-4 py-2 border-b border-border bg-secondary/20">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'journey' as const, label: 'Journey' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-foreground text-background'
                : 'text-low hover:text-normal hover:bg-secondary'
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'journey' && <JourneyTab data={data} />}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 border-t border-border">
        <p className="text-xs text-low">Click on any item to expand details</p>
      </footer>
    </div>
  );
}
