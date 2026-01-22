import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { common, createLowlight } from 'lowlight';
import { marked } from 'marked';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { documentsApi } from '@/lib/api';
import { Loader2, Check, AlertCircle } from 'lucide-react';

const lowlight = createLowlight(common);

// Define extensions outside component to avoid recreation
const extensions = [
  StarterKit.configure({
    codeBlock: false, // Disable default code block to use lowlight version
  }),
  Link.configure({
    openOnClick: true,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  }),
  Typography,
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  Placeholder.configure({
    placeholder: 'Start writing...',
  }),
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TiptapMarkdownViewerProps {
  content: string;
  className?: string;
  projectId: string;
  relativePath: string;
  onContentChange?: (content: string) => void;
}

// Convert HTML back to Markdown (simplified)
function htmlToMarkdown(html: string): string {
  let markdown = html;

  // Handle code blocks first (before other replacements)
  markdown = markdown.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_, code) => {
      const decodedCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return '\n```\n' + decodedCode.trim() + '\n```\n';
    }
  );

  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // Bold and italic
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');

  // Inline code
  markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`');

  // Links
  markdown = markdown.replace(
    /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
    '[$2]($1)'
  );

  // Images
  markdown = markdown.replace(
    /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    '![$2]($1)'
  );

  // Lists
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return (
      content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n').trim() + '\n\n'
    );
  });
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let index = 1;
    return (
      content
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${index++}. $1\n`)
        .trim() + '\n\n'
    );
  });

  // Blockquotes
  markdown = markdown.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, content) => {
      return (
        content
          .trim()
          .split('\n')
          .map((line: string) => '> ' + line)
          .join('\n') + '\n\n'
      );
    }
  );

  // Horizontal rules
  markdown = markdown.replace(/<hr[^>]*\/?>/gi, '\n---\n\n');

  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

  // Line breaks
  markdown = markdown.replace(/<br[^>]*\/?>/gi, '\n');

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  markdown = markdown
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Clean up multiple newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}

export function TiptapMarkdownViewer({
  content,
  className,
  projectId,
  relativePath,
  onContentChange,
}: TiptapMarkdownViewerProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(content);

  // Convert markdown to HTML
  const htmlContent = useMemo(() => {
    try {
      return marked.parse(content, {
        gfm: true,
        breaks: true,
      }) as string;
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return `<p>${content}</p>`;
    }
  }, [content]);

  // Save function
  const saveContent = useCallback(
    async (newContent: string) => {
      if (newContent === lastSavedContentRef.current) {
        return;
      }

      setSaveStatus('saving');
      try {
        await documentsApi.update(projectId, relativePath, newContent);
        lastSavedContentRef.current = newContent;
        setSaveStatus('saved');

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Failed to save document:', error);
        setSaveStatus('error');

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    },
    [projectId, relativePath]
  );

  // Debounced save
  const debouncedSave = useCallback(
    (html: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const markdown = htmlToMarkdown(html);
      onContentChange?.(markdown);

      saveTimeoutRef.current = setTimeout(() => {
        saveContent(markdown);
      }, 1000); // Auto-save after 1 second of inactivity
    },
    [saveContent, onContentChange]
  );

  const editor = useEditor({
    extensions,
    content: htmlContent,
    editable: true,
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none min-h-[200px]',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
  });

  // Update content when it changes from outside
  useEffect(() => {
    if (editor && htmlContent && !editor.isFocused) {
      const currentContent = editor.getHTML();
      if (currentContent !== htmlContent) {
        editor.commands.setContent(htmlContent);
        lastSavedContentRef.current = content;
      }
    }
  }, [editor, htmlContent, content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('tiptap-markdown-editor relative', className)}>
      {/* Save status indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 text-xs">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-muted-foreground bg-background/80 px-2 py-1 rounded">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-green-500 bg-background/80 px-2 py-1 rounded">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-destructive bg-background/80 px-2 py-1 rounded">
            <AlertCircle className="w-3 h-3" />
            Save failed
          </span>
        )}
      </div>

      <div
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          // Customize prose styles
          'prose-headings:font-semibold prose-headings:text-foreground',
          'prose-p:text-muted-foreground prose-p:leading-relaxed',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
          'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg',
          'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
          'prose-ul:text-muted-foreground prose-ol:text-muted-foreground',
          'prose-li:marker:text-muted-foreground',
          'prose-table:border prose-table:border-border',
          'prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium',
          'prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border',
          'prose-hr:border-border',
          'prose-img:rounded-lg prose-img:border prose-img:border-border'
        )}
      >
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .tiptap-editor {
          padding: 0;
        }
        
        .tiptap-editor:focus {
          outline: none;
        }
        
        .tiptap-editor .ProseMirror {
          min-height: 200px;
        }
        
        .tiptap-editor .ProseMirror:focus {
          outline: none;
        }
        
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .tiptap-editor pre {
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }
        
        .tiptap-editor pre code {
          background: transparent;
          padding: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        .tiptap-editor code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.875em;
        }
        
        .tiptap-editor a {
          color: hsl(var(--primary));
          text-decoration: none;
        }
        
        .tiptap-editor a:hover {
          text-decoration: underline;
        }
        
        .tiptap-editor blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1rem;
          margin-left: 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        
        .tiptap-editor h1,
        .tiptap-editor h2,
        .tiptap-editor h3,
        .tiptap-editor h4,
        .tiptap-editor h5,
        .tiptap-editor h6 {
          color: hsl(var(--foreground));
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .tiptap-editor h1 { font-size: 2em; }
        .tiptap-editor h2 { font-size: 1.5em; }
        .tiptap-editor h3 { font-size: 1.25em; }
        .tiptap-editor h4 { font-size: 1.1em; }
        
        .tiptap-editor p {
          margin-bottom: 1em;
          line-height: 1.7;
        }
        
        .tiptap-editor ul,
        .tiptap-editor ol {
          padding-left: 1.5rem;
          margin-bottom: 1em;
        }
        
        .tiptap-editor li {
          margin-bottom: 0.25em;
        }
        
        .tiptap-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .tiptap-editor th,
        .tiptap-editor td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        
        .tiptap-editor th {
          background: hsl(var(--muted));
          font-weight: 500;
        }
        
        .tiptap-editor hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2rem 0;
        }
        
        .tiptap-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        
        /* Syntax highlighting styles */
        .tiptap-editor .hljs-comment,
        .tiptap-editor .hljs-quote {
          color: #6a737d;
        }
        
        .tiptap-editor .hljs-variable,
        .tiptap-editor .hljs-template-variable,
        .tiptap-editor .hljs-attribute,
        .tiptap-editor .hljs-tag,
        .tiptap-editor .hljs-name,
        .tiptap-editor .hljs-regexp,
        .tiptap-editor .hljs-link,
        .tiptap-editor .hljs-selector-id,
        .tiptap-editor .hljs-selector-class {
          color: #e36209;
        }
        
        .tiptap-editor .hljs-number,
        .tiptap-editor .hljs-meta,
        .tiptap-editor .hljs-built_in,
        .tiptap-editor .hljs-builtin-name,
        .tiptap-editor .hljs-literal,
        .tiptap-editor .hljs-type,
        .tiptap-editor .hljs-params {
          color: #005cc5;
        }
        
        .tiptap-editor .hljs-string,
        .tiptap-editor .hljs-symbol,
        .tiptap-editor .hljs-bullet {
          color: #032f62;
        }
        
        .tiptap-editor .hljs-title,
        .tiptap-editor .hljs-section {
          color: #6f42c1;
        }
        
        .tiptap-editor .hljs-keyword,
        .tiptap-editor .hljs-selector-tag {
          color: #d73a49;
        }
        
        .dark .tiptap-editor .hljs-comment,
        .dark .tiptap-editor .hljs-quote {
          color: #8b949e;
        }
        
        .dark .tiptap-editor .hljs-variable,
        .dark .tiptap-editor .hljs-template-variable,
        .dark .tiptap-editor .hljs-attribute,
        .dark .tiptap-editor .hljs-tag,
        .dark .tiptap-editor .hljs-name,
        .dark .tiptap-editor .hljs-regexp,
        .dark .tiptap-editor .hljs-link,
        .dark .tiptap-editor .hljs-selector-id,
        .dark .tiptap-editor .hljs-selector-class {
          color: #ffa657;
        }
        
        .dark .tiptap-editor .hljs-number,
        .dark .tiptap-editor .hljs-meta,
        .dark .tiptap-editor .hljs-built_in,
        .dark .tiptap-editor .hljs-builtin-name,
        .dark .tiptap-editor .hljs-literal,
        .dark .tiptap-editor .hljs-type,
        .dark .tiptap-editor .hljs-params {
          color: #79c0ff;
        }
        
        .dark .tiptap-editor .hljs-string,
        .dark .tiptap-editor .hljs-symbol,
        .dark .tiptap-editor .hljs-bullet {
          color: #a5d6ff;
        }
        
        .dark .tiptap-editor .hljs-title,
        .dark .tiptap-editor .hljs-section {
          color: #d2a8ff;
        }
        
        .dark .tiptap-editor .hljs-keyword,
        .dark .tiptap-editor .hljs-selector-tag {
          color: #ff7b72;
        }
      `}</style>
    </div>
  );
}
