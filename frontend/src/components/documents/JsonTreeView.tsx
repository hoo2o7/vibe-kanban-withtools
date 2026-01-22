import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface JsonTreeViewProps {
  content: string;
  className?: string;
}

interface TreeNodeProps {
  keyName: string | number;
  value: unknown;
  level: number;
  path: string;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}

function getValueColor(value: unknown): string {
  if (value === null) return 'text-gray-500';
  if (typeof value === 'boolean') return 'text-blue-500';
  if (typeof value === 'number') return 'text-amber-500';
  if (typeof value === 'string') return 'text-green-500';
  return 'text-foreground';
}

function getValueDisplay(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const display = value.length > 50 ? value.substring(0, 47) + '...' : value;
    return `"${display}"`;
  }
  return String(value);
}

function TreeNode({
  keyName,
  value,
  level,
  path,
  expandedPaths,
  toggleExpand,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(path);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  const childCount = isObject
    ? isArray
      ? value.length
      : Object.keys(value).length
    : 0;

  const indent = level * 16;

  if (!isObject) {
    // Primitive value
    return (
      <div
        className="flex items-center py-0.5 hover:bg-muted/50 rounded px-2"
        style={{ paddingLeft: indent + 8 }}
      >
        <span className="text-purple-500 font-mono text-sm">{keyName}</span>
        <span className="text-muted-foreground mx-1">:</span>
        <span className={cn('font-mono text-sm', getValueColor(value))}>
          {getValueDisplay(value)}
        </span>
      </div>
    );
  }

  // Object or Array
  return (
    <div>
      <div
        className="flex items-center py-0.5 hover:bg-muted/50 rounded px-2 cursor-pointer"
        style={{ paddingLeft: indent }}
        onClick={() => toggleExpand(path)}
      >
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <span className="text-purple-500 font-mono text-sm ml-1">{keyName}</span>
        <span className="text-muted-foreground mx-1 font-mono text-sm">
          {isArray ? '[' : '{'}
        </span>
        {!isExpanded && (
          <>
            <span className="text-muted-foreground font-mono text-xs">
              {childCount} {childCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-muted-foreground font-mono text-sm ml-1">
              {isArray ? ']' : '}'}
            </span>
          </>
        )}
      </div>

      {isExpanded && (
        <>
          {isArray
            ? (value as unknown[]).map((item, index) => (
                <TreeNode
                  key={index}
                  keyName={index}
                  value={item}
                  level={level + 1}
                  path={`${path}[${index}]`}
                  expandedPaths={expandedPaths}
                  toggleExpand={toggleExpand}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(
                ([key, val]) => (
                  <TreeNode
                    key={key}
                    keyName={key}
                    value={val}
                    level={level + 1}
                    path={`${path}.${key}`}
                    expandedPaths={expandedPaths}
                    toggleExpand={toggleExpand}
                  />
                )
              )}
          <div
            className="text-muted-foreground font-mono text-sm py-0.5 px-2"
            style={{ paddingLeft: indent + 8 }}
          >
            {isArray ? ']' : '}'}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonTreeView({ content, className }: JsonTreeViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['root'])
  );
  const [copied, setCopied] = useState(false);

  const { json, parseError } = useMemo(() => {
    try {
      return { json: JSON.parse(content), parseError: null };
    } catch (e) {
      return {
        json: null,
        parseError: e instanceof Error ? e.message : 'Invalid JSON',
      };
    }
  }, [content]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const paths = new Set<string>();
    const traverse = (obj: unknown, path: string) => {
      paths.add(path);
      if (obj !== null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
        } else {
          Object.entries(obj).forEach(([key, val]) =>
            traverse(val, `${path}.${key}`)
          );
        }
      }
    };
    if (json) traverse(json, 'root');
    setExpandedPaths(paths);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['root']));
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

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
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={copyJson}>
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto p-4">
        <TreeNode
          keyName="root"
          value={json}
          level={0}
          path="root"
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
        />
      </div>
    </div>
  );
}
