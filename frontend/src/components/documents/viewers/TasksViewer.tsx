import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, FileText, Link2, Clock, CheckCircle2, Circle, Loader2, Search, X } from 'lucide-react';

interface TasksViewerProps {
  content: string;
  className?: string;
}

// Flexible task structure to support various formats
interface Task {
  id: string | number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  stage?: string;
  dependencies?: (string | number)[];
  files?: string[];
  subtasks?: Subtask[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  // Allow any additional fields
  [key: string]: unknown;
}

interface Subtask {
  id: string | number;
  title: string;
  status: string;
  description?: string;
}

interface Feature {
  number?: string;
  name: string;
  design_validation_required?: boolean;
  tasks: Task[];
}

interface TasksMetadata {
  created_at?: string;
  last_updated?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
  TotalTasks?: number;
  totalTasks?: number;
  projectName?: string;
}

// Support multiple data formats
interface TasksData {
  metadata?: TasksMetadata;
  features?: Feature[];
  tasks?: Task[];
  projectName?: string;
}

type StatusFilter = 'all' | 'pending' | 'in-progress' | 'done' | 'completed' | 'in_progress';

// Normalize status for comparison
function normalizeStatus(status: string): string {
  const s = status.toLowerCase().replace(/[_-]/g, '');
  if (s === 'inprogress') return 'in-progress';
  if (s === 'done' || s === 'completed') return 'done';
  return status.toLowerCase();
}

// Status styling
const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/30',
    icon: <Circle className="w-3 h-3" />,
  },
  'in-progress': {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/30',
    icon: <Loader2 className="w-3 h-3" />,
  },
  done: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/30',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  blocked: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
    icon: <Circle className="w-3 h-3" />,
  },
  deferred: {
    bg: 'bg-muted-foreground/10',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/30',
    icon: <Circle className="w-3 h-3" />,
  },
};

const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' },
  low: { bg: 'bg-muted-foreground/10', text: 'text-muted-foreground', border: 'border-muted-foreground/30' },
};

function getStatusStyle(status: string) {
  const normalized = normalizeStatus(status);
  return statusConfig[normalized] || statusConfig.pending;
}

function getPriorityStyle(priority: string) {
  return priorityConfig[priority.toLowerCase()] || priorityConfig.medium;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Task Item Component
function TaskItem({ task, isExpanded, onToggle }: { task: Task; isExpanded: boolean; onToggle: () => void }) {
  const statusStyle = getStatusStyle(task.status);
  const isDesignReview = task.stage === 'design-review';
  const createdAt = task.created_at || task.createdAt;
  const updatedAt = task.updated_at || task.updatedAt;

  return (
    <div className="transition-all duration-200">
      <div
        onClick={onToggle}
        className={cn(
          'px-3 py-2 cursor-pointer transition-colors',
          isExpanded ? 'bg-secondary' : 'hover:bg-secondary/50'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Task ID */}
          <span className="text-xs font-ibm-plex-mono text-info shrink-0 w-20">
            {typeof task.id === 'number' ? `#${task.id}` : task.id}
          </span>

          {/* Priority */}
          {task.priority && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs font-medium border shrink-0',
                getPriorityStyle(task.priority).bg,
                getPriorityStyle(task.priority).text,
                getPriorityStyle(task.priority).border
              )}
            >
              {task.priority}
            </span>
          )}

          {/* Task Title */}
          <span
            className={cn(
              'flex-1 min-w-0 text-sm text-high truncate',
              isDesignReview && 'text-[hsl(320_70%_60%)]'
            )}
            title={task.title}
          >
            {task.title}
          </span>

          {/* Status */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border shrink-0',
              statusStyle.bg,
              statusStyle.text,
              statusStyle.border
            )}
          >
            {statusStyle.icon}
            {task.status}
          </span>

          {/* Stage (if exists) */}
          {task.stage && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-xs font-medium border shrink-0',
                task.stage === 'design-review'
                  ? 'bg-[hsl(320_70%_60%/0.1)] text-[hsl(320_70%_60%)] border-[hsl(320_70%_60%/0.3)]'
                  : 'bg-info/10 text-info border-info/30'
              )}
            >
              {task.stage}
            </span>
          )}

          {/* Subtasks count */}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs text-low bg-panel shrink-0">
              {task.subtasks.filter((s) => normalizeStatus(s.status) === 'done').length}/{task.subtasks.length}
            </span>
          )}

          <ChevronDown
            className={cn('w-4 h-4 text-low transition-transform shrink-0', isExpanded && 'rotate-180')}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 bg-secondary border-t border-border">
          <div className="pt-3 space-y-3">
            {/* Description */}
            {task.description && (
              <div>
                <div className="text-xs font-medium text-low uppercase tracking-wider mb-1">Description</div>
                <p className="text-sm text-normal leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Notes */}
            {task.notes && (
              <div>
                <div className="text-xs font-medium text-low uppercase tracking-wider mb-1">Notes</div>
                <p className="text-sm text-normal leading-relaxed whitespace-pre-wrap bg-panel/50 p-2 rounded border border-border">
                  {task.notes}
                </p>
              </div>
            )}

            {/* Dependencies */}
            {task.dependencies && task.dependencies.length > 0 && (
              <div>
                <div className="text-xs font-medium text-low uppercase tracking-wider mb-1.5">Dependencies</div>
                <div className="flex flex-wrap gap-1.5">
                  {task.dependencies.map((dep, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-info/10 text-info text-xs font-ibm-plex-mono border border-info/20"
                    >
                      <Link2 className="w-3 h-3" />
                      {typeof dep === 'number' ? `#${dep}` : dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {task.files && task.files.length > 0 && (
              <div>
                <div className="text-xs font-medium text-low uppercase tracking-wider mb-1.5">
                  Files ({task.files.length})
                </div>
                <div className="space-y-1">
                  {task.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-panel text-xs font-ibm-plex-mono text-low"
                    >
                      <FileText className="w-3 h-3 text-info" />
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <div className="text-xs font-medium text-low uppercase tracking-wider mb-1.5">
                  Subtasks ({task.subtasks.length})
                </div>
                <div className="space-y-1">
                  {task.subtasks.map((subtask, idx) => {
                    const subStatusStyle = getStatusStyle(subtask.status);
                    return (
                      <div key={idx} className="flex items-start gap-2 px-2 py-1.5 rounded bg-panel">
                        <span className={cn('shrink-0 mt-0.5', subStatusStyle.text)}>{subStatusStyle.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-normal">{subtask.title}</div>
                          {subtask.description && (
                            <div className="text-xs text-low mt-0.5">{subtask.description}</div>
                          )}
                        </div>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded', subStatusStyle.bg, subStatusStyle.text)}>
                          {subtask.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {(createdAt || updatedAt) && (
              <div>
                <div className="text-xs font-medium text-low uppercase tracking-wider mb-1.5">Timeline</div>
                <div className="grid grid-cols-2 gap-3">
                  {createdAt && (
                    <div>
                      <div className="text-xs text-low">Created</div>
                      <div className="text-xs font-ibm-plex-mono text-normal">{formatDate(createdAt)}</div>
                    </div>
                  )}
                  {updatedAt && (
                    <div>
                      <div className="text-xs text-low">Updated</div>
                      <div className="text-xs font-ibm-plex-mono text-normal">{formatDate(updatedAt)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Fields (dynamic) */}
            {(() => {
              const knownKeys = new Set([
                'id',
                'title',
                'description',
                'status',
                'priority',
                'stage',
                'dependencies',
                'files',
                'subtasks',
                'notes',
                'created_at',
                'updated_at',
                'createdAt',
                'updatedAt',
              ]);
              const additionalFields = Object.entries(task).filter(
                ([key, value]) => !knownKeys.has(key) && value !== null && value !== undefined && value !== ''
              );

              if (additionalFields.length === 0) return null;

              return additionalFields.map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs font-medium text-low uppercase tracking-wider mb-1">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-normal">
                    {typeof value === 'object' ? (
                      <pre className="text-xs font-ibm-plex-mono bg-panel p-2 rounded overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : Array.isArray(value) ? (
                      <div className="flex flex-wrap gap-1">
                        {value.map((item, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-panel text-xs rounded">
                            {String(item)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{String(value)}</span>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  feature,
  filter,
  searchQuery,
  expandedTasks,
  toggleTask,
}: {
  feature: Feature;
  filter: StatusFilter;
  searchQuery: string;
  expandedTasks: Set<string>;
  toggleTask: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredTasks = useMemo(() => {
    let tasks = feature.tasks;

    // Filter by status
    if (filter !== 'all') {
      tasks = tasks.filter((task) => {
        const normalized = normalizeStatus(task.status);
        const filterNormalized = normalizeStatus(filter);
        return normalized === filterNormalized;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          String(task.id).toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    return tasks;
  }, [feature.tasks, filter, searchQuery]);

  if (filteredTasks.length === 0) return null;

  return (
    <div className={cn('rounded border bg-secondary overflow-hidden', isExpanded && 'border-foreground/20')}>
      {/* Feature Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors',
          isExpanded ? 'bg-foreground/5 border-b border-border' : 'hover:bg-foreground/5'
        )}
      >
        <div className="flex items-center gap-2.5 flex-1">
          {feature.number && (
            <span className="px-2 py-0.5 bg-foreground text-background text-xs font-semibold font-ibm-plex-mono rounded">
              {feature.number}
            </span>
          )}
          <h3 className="text-sm font-semibold text-high">{feature.name}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-low bg-panel px-2 py-0.5 rounded">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
          {feature.design_validation_required && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(320_70%_60%/0.15)] text-[hsl(320_70%_60%)]">
              Design
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-low transition-transform', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {/* Tasks List */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {filteredTasks.map((task) => {
            const taskKey = String(task.id);
            return (
              <TaskItem
                key={taskKey}
                task={task}
                isExpanded={expandedTasks.has(taskKey)}
                onToggle={() => toggleTask(taskKey)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Component
export function TasksViewer({ content, className }: TasksViewerProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const { data, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(content) as TasksData;
      return { data: parsed, parseError: null };
    } catch (e) {
      return {
        data: null,
        parseError: e instanceof Error ? e.message : 'Invalid JSON',
      };
    }
  }, [content]);

  // Extract all tasks (support both formats)
  const { allTasks, features, metadata } = useMemo(() => {
    if (!data) return { allTasks: [], features: [], metadata: null };

    let tasks: Task[] = [];
    let featureList: Feature[] = [];

    // Format 1: features array with nested tasks
    if (data.features && Array.isArray(data.features)) {
      featureList = data.features;
      data.features.forEach((f) => {
        if (f.tasks) tasks = tasks.concat(f.tasks);
      });
    }
    // Format 2: flat tasks array (task master format)
    else if (data.tasks && Array.isArray(data.tasks)) {
      tasks = data.tasks;
      // Group tasks into a single "feature" for consistent rendering
      featureList = [{ name: 'All Tasks', tasks: data.tasks }];
    }

    return {
      allTasks: tasks,
      features: featureList,
      metadata: data.metadata,
    };
  }, [data]);

  // Task counts by status
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: allTasks.length };
    allTasks.forEach((task) => {
      const normalized = normalizeStatus(task.status);
      result[normalized] = (result[normalized] || 0) + 1;
    });
    return result;
  }, [allTasks]);

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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

  const tabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: counts.all || 0 },
    { id: 'pending', label: 'Pending', count: counts.pending || 0 },
    { id: 'in-progress', label: 'In Progress', count: counts['in-progress'] || 0 },
    { id: 'done', label: 'Done', count: counts.done || 0 },
  ];

  // Add blocked/deferred tabs if they exist
  if (counts.blocked) {
    tabs.push({ id: 'blocked' as StatusFilter, label: 'Blocked', count: counts.blocked });
  }
  if (counts.deferred) {
    tabs.push({ id: 'deferred' as StatusFilter, label: 'Deferred', count: counts.deferred || 0 });
  }

  return (
    <div className={cn('h-full w-full flex flex-col', className)}>
      {/* Header */}
      <header className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-high">Tasks</h1>
          {metadata?.version && (
            <span className="text-xs text-low font-ibm-plex-mono bg-panel px-1.5 py-0.5 rounded">
              v{metadata.version}
            </span>
          )}
        </div>

        {/* Metadata Stats */}
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-low">Total</span>
            <span className="ml-1.5 text-foreground font-medium">{allTasks.length}</span>
          </div>
          {counts.done !== undefined && (
            <div>
              <span className="text-low">Done</span>
              <span className="ml-1.5 text-success font-medium">{counts.done || 0}</span>
            </div>
          )}
          {counts['in-progress'] !== undefined && (
            <div>
              <span className="text-low">In Progress</span>
              <span className="ml-1.5 text-info font-medium">{counts['in-progress'] || 0}</span>
            </div>
          )}
          {counts.pending !== undefined && (
            <div>
              <span className="text-low">Pending</span>
              <span className="ml-1.5 text-warning font-medium">{counts.pending || 0}</span>
            </div>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-2 border-b border-border bg-secondary/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-low" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-panel rounded border border-border focus:border-foreground/30 focus:outline-none placeholder:text-low"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-low hover:text-normal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <nav className="flex gap-1 px-4 py-2 border-b border-border bg-secondary/20 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'px-2.5 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
              filter === tab.id
                ? 'bg-foreground text-background'
                : 'text-low hover:text-normal hover:bg-secondary'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs',
                filter === tab.id ? 'bg-background/20' : 'bg-panel'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {features.map((feature, idx) => (
            <FeatureCard
              key={feature.number || idx}
              feature={feature}
              filter={filter}
              searchQuery={searchQuery}
              expandedTasks={expandedTasks}
              toggleTask={toggleTask}
            />
          ))}

          {features.every((f) => {
            let tasks = f.tasks;
            if (filter !== 'all') {
              tasks = tasks.filter((t) => normalizeStatus(t.status) === normalizeStatus(filter));
            }
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase();
              tasks = tasks.filter(
                (t) =>
                  t.title.toLowerCase().includes(query) ||
                  String(t.id).toLowerCase().includes(query) ||
                  t.description?.toLowerCase().includes(query)
              );
            }
            return tasks.length === 0;
          }) && (
            <div className="text-center py-8 text-low">
              {searchQuery ? `No tasks found for "${searchQuery}"` : 'No tasks found for this filter.'}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      {metadata && (metadata.last_updated || metadata.updatedAt) && (
        <footer className="px-4 py-2 border-t border-border text-xs text-low flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last updated: {formatDate(metadata.last_updated || metadata.updatedAt)}
        </footer>
      )}
    </div>
  );
}
