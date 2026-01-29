import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Bell,
  Mail,
  MessageSquare,
  User,
  Pen,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  DollarSign,
  AlertTriangle,
  UserPlus,
  Heart,
  Gift,
  ChevronDown,
  LayoutGrid,
  Table,
} from 'lucide-react';

interface NotificationScenariosViewerProps {
  content: string;
  className?: string;
}

interface NotificationEvent {
  event: string;
  title: string;
  description: string;
  channel: string;
  template: string;
  [key: string]: unknown;
}

interface NotificationScenariosData {
  version?: string;
  description?: string;
  channels?: string[];
  scenarios?: Record<string, NotificationEvent[]>;
  [key: string]: unknown;
}

type ViewMode = 'cards' | 'table';

// Role configuration with vibe-kanban colors
const roleColorPalette = [
  { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info', headerBg: 'bg-info' },
  { bg: 'bg-[hsl(280_60%_50%/0.1)]', border: 'border-[hsl(280_60%_50%/0.3)]', text: 'text-[hsl(280_60%_50%)]', headerBg: 'bg-[hsl(280_60%_50%)]' },
  { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', headerBg: 'bg-warning' },
  { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', headerBg: 'bg-success' },
  { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', headerBg: 'bg-destructive' },
];

// Role icons mapping
const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  reader: User,
  creator: Pen,
  admin: Shield,
  user: User,
  system: Bell,
};

// Event icons mapping
const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  proposal_accepted: CheckCircle2,
  proposal_rejected: XCircle,
  refund_completed: RefreshCw,
  report_resolved: FileText,
  episode_published: FileText,
  new_proposal: Bell,
  new_backing: Heart,
  new_sponsor: Gift,
  settlement_completed: DollarSign,
  settlement_rejected: XCircle,
  new_report: AlertTriangle,
  withdrawal_request: DollarSign,
  new_user_signup: UserPlus,
};

function getRoleIcon(role: string) {
  return roleIcons[role.toLowerCase()] || Bell;
}

function getEventIcon(event: string) {
  return eventIcons[event] || Bell;
}

function getRoleColor(index: number) {
  return roleColorPalette[index % roleColorPalette.length];
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    reader: '독자 (Reader)',
    creator: '작가 (Creator)',
    admin: '관리자 (Admin)',
    user: '사용자 (User)',
    system: '시스템 (System)',
  };
  return labels[role.toLowerCase()] || role;
}

// Channel Badge
function ChannelBadge({ channel }: { channel: string }) {
  const isEmail = channel.toLowerCase() === 'email';
  const isSms = channel.toLowerCase() === 'sms';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        isEmail && 'bg-panel text-normal',
        isSms && 'bg-success/10 text-success',
        !isEmail && !isSms && 'bg-info/10 text-info'
      )}
    >
      {isEmail ? <Mail className="w-3 h-3" /> : isSms ? <MessageSquare className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
      {channel.toUpperCase()}
    </span>
  );
}

// Event Card
function EventCard({
  event,
  roleIndex,
  isExpanded,
  onToggle,
}: {
  event: NotificationEvent;
  roleIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = getRoleColor(roleIndex);
  const EventIcon = getEventIcon(event.event);

  return (
    <div
      onClick={onToggle}
      className={cn(
        'p-3 rounded border cursor-pointer transition-all bg-background',
        isExpanded ? `${color.border} border-2 shadow-sm` : 'hover:bg-secondary/50 border-border'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('p-1.5 rounded', color.bg)}>
          <EventIcon className={cn('w-4 h-4', color.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-high">{event.title}</span>
            <ChannelBadge channel={event.channel} />
          </div>
          <p className="text-xs text-low mb-1.5">{event.description}</p>
          <code className={cn('text-xs px-1.5 py-0.5 rounded font-ibm-plex-mono', color.bg, color.text)}>
            {event.event}
          </code>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-low transition-transform shrink-0', isExpanded && 'rotate-180')} />
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-low mb-1 font-medium">템플릿:</div>
          <p className="text-sm text-normal bg-panel p-2 rounded border border-border whitespace-pre-wrap">{event.template}</p>

          {/* Additional fields */}
          {Object.entries(event)
            .filter(([key]) => !['event', 'title', 'description', 'channel', 'template'].includes(key))
            .map(([key, value]) => (
              <div key={key} className="mt-2">
                <div className="text-xs text-low mb-1 font-medium capitalize">{key.replace(/_/g, ' ')}:</div>
                <div className="text-sm text-normal">
                  {typeof value === 'object' ? (
                    <pre className="text-xs font-ibm-plex-mono bg-panel p-2 rounded overflow-auto">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <span className="whitespace-pre-wrap">{String(value)}</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Role Section
function RoleSection({
  role,
  events,
  roleIndex,
  expandedEvents,
  toggleEvent,
}: {
  role: string;
  events: NotificationEvent[];
  roleIndex: number;
  expandedEvents: Set<string>;
  toggleEvent: (key: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const color = getRoleColor(roleIndex);
  const RoleIcon = getRoleIcon(role);

  return (
    <div className={cn('rounded border overflow-hidden transition-all', isExpanded ? color.border : 'border-border')}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'px-3 py-2.5 cursor-pointer transition-colors',
          isExpanded ? color.headerBg : 'bg-secondary hover:bg-secondary/80'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('p-1.5 rounded', isExpanded ? 'bg-background/20' : color.bg)}>
            <RoleIcon className={cn('w-4 h-4', isExpanded ? 'text-background' : color.text)} />
          </div>
          <div className="flex-1">
            <h3 className={cn('text-sm font-semibold', isExpanded ? 'text-background' : 'text-high')}>
              {getRoleLabel(role)}
            </h3>
            <p className={cn('text-xs', isExpanded ? 'text-background/80' : 'text-low')}>
              {events.length}개 알림 이벤트
            </p>
          </div>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', isExpanded ? 'text-background/80 rotate-180' : 'text-low')}
          />
        </div>
      </div>

      {/* Events */}
      {isExpanded && (
        <div className="bg-secondary/30 p-3 space-y-2 border-t border-border">
          {events.map((event) => {
            const eventKey = `${role}-${event.event}`;
            return (
              <EventCard
                key={eventKey}
                event={event}
                roleIndex={roleIndex}
                isExpanded={expandedEvents.has(eventKey)}
                onToggle={() => toggleEvent(eventKey)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Table View
function TableView({
  scenarios,
}: {
  scenarios: Record<string, NotificationEvent[]>;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary border-b border-border">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-low">역할</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-low">이벤트</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-low">제목</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-low">설명</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-low">채널</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-low">템플릿</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Object.entries(scenarios).flatMap(([role, events], roleIndex) =>
            events.map((event, eventIndex) => {
              const color = getRoleColor(roleIndex);
              const RoleIcon = getRoleIcon(role);
              return (
                <tr key={`${role}-${event.event}`} className="hover:bg-secondary/50">
                  <td className="px-3 py-2">
                    {eventIndex === 0 && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                          color.bg,
                          color.text
                        )}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {role}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <code className="text-xs bg-panel px-1.5 py-0.5 rounded font-ibm-plex-mono text-low">
                      {event.event}
                    </code>
                  </td>
                  <td className="px-3 py-2 font-medium text-high">{event.title}</td>
                  <td className="px-3 py-2 text-low">{event.description}</td>
                  <td className="px-3 py-2">
                    <ChannelBadge channel={event.channel} />
                  </td>
                  <td className="px-3 py-2 text-low max-w-xs truncate" title={event.template}>
                    {event.template}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// Main Component
export function NotificationScenariosViewer({ content, className }: NotificationScenariosViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const { data, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as NotificationScenariosData;
      return { data: parsed, parseError: null };
    } catch (e) {
      return {
        data: null,
        parseError: e instanceof Error ? e.message : 'Invalid JSON',
      };
    }
  }, [content]);

  const scenarios = useMemo(() => data?.scenarios || {}, [data]);
  const roles = useMemo(() => Object.keys(scenarios), [scenarios]);
  const totalEvents = useMemo(
    () => Object.values(scenarios).reduce((sum, events) => sum + events.length, 0),
    [scenarios]
  );

  const toggleEvent = (key: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (parseError || !data) {
    return (
      <div className={cn('flex items-center justify-center h-full text-destructive', className)}>
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-foreground" />
            <h1 className="text-lg font-semibold text-high">알림 시나리오</h1>
          </div>
          {data.version && (
            <span className="text-xs text-low font-ibm-plex-mono bg-panel px-1.5 py-0.5 rounded">
              v{data.version}
            </span>
          )}
        </div>
        {data.description && <p className="text-xs text-low">{data.description}</p>}
      </header>

      {/* Stats Summary */}
      <div className="px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-low">전체</span>
            <span className="text-sm font-semibold text-high">{totalEvents}</span>
          </div>
          {roles.map((role, idx) => {
            const color = getRoleColor(idx);
            const RoleIcon = getRoleIcon(role);
            return (
              <div key={role} className="flex items-center gap-1.5">
                <RoleIcon className={cn('w-3.5 h-3.5', color.text)} />
                <span className="text-xs text-low">{role}</span>
                <span className={cn('text-sm font-semibold', color.text)}>{scenarios[role]?.length || 0}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle */}
      <nav className="flex gap-1 px-4 py-2 border-b border-border bg-secondary/20">
        <button
          onClick={() => setViewMode('cards')}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5',
            viewMode === 'cards' ? 'bg-foreground text-background' : 'text-low hover:text-normal hover:bg-secondary'
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          카드 뷰
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5',
            viewMode === 'table' ? 'bg-foreground text-background' : 'text-low hover:text-normal hover:bg-secondary'
          )}
        >
          <Table className="w-3.5 h-3.5" />
          테이블 뷰
        </button>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map((role, idx) => (
              <RoleSection
                key={role}
                role={role}
                events={scenarios[role] || []}
                roleIndex={idx}
                expandedEvents={expandedEvents}
                toggleEvent={toggleEvent}
              />
            ))}
          </div>
        ) : (
          <div className="rounded border border-border overflow-hidden bg-secondary">
            <TableView scenarios={scenarios} />
          </div>
        )}
      </main>

      {/* Footer - Channels Legend */}
      {data.channels && data.channels.length > 0 && (
        <footer className="px-4 py-2 border-t border-border">
          <div className="flex items-center gap-4">
            <span className="text-xs text-low">지원 채널:</span>
            {data.channels.map((channel) => (
              <div key={channel} className="flex items-center gap-1.5">
                {channel.toLowerCase() === 'email' ? (
                  <Mail className="w-3.5 h-3.5 text-normal" />
                ) : channel.toLowerCase() === 'sms' ? (
                  <MessageSquare className="w-3.5 h-3.5 text-low" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-low" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    channel.toLowerCase() === 'email' ? 'text-normal' : 'text-low'
                  )}
                >
                  {channel.toUpperCase()}
                  {channel.toLowerCase() === 'sms' && ' (준비중)'}
                </span>
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
