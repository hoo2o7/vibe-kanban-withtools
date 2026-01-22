import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface UserStoriesViewerProps {
  content: string;
  className?: string;
}

/**
 * Custom viewer for user_stories_data JSON files.
 * This component will be implemented with the visualization code provided by the user.
 */
export function UserStoriesViewer({
  content,
  className,
}: UserStoriesViewerProps) {
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

  // TODO: Implement custom visualization based on user-provided code
  return (
    <div className={cn('h-full w-full p-6', className)}>
      <div className="text-center text-muted-foreground">
        <p className="font-medium">User Stories Viewer</p>
        <p className="text-sm mt-2">
          Visualization will be implemented here based on provided code.
        </p>
        <pre className="mt-4 text-xs text-left bg-muted p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(json, null, 2)}
        </pre>
      </div>
    </div>
  );
}
