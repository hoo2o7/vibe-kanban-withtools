import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText } from 'lucide-react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { defineModal } from '@/lib/modals';

export interface CreateFileDialogProps {
  parentPath?: string;
  existingNames?: string[];
}

export type CreateFileResult = {
  action: 'created' | 'canceled';
  fileName?: string;
  fullPath?: string;
};

const CreateFileDialogImpl = NiceModal.create<CreateFileDialogProps>(
  ({ parentPath = '', existingNames = [] }) => {
    const modal = useModal();
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (modal.visible) {
        setFileName('');
        setError(null);
      }
    }, [modal.visible]);

    const validateFileName = (name: string): string | null => {
      const trimmedName = name.trim();
      if (!trimmedName) return 'File name cannot be empty';
      if (trimmedName.length > 100)
        return 'File name must be 100 characters or less';
      if (/[<>:"/\\|?*]/.test(trimmedName)) {
        return 'File name contains invalid characters';
      }
      if (trimmedName.startsWith('.')) {
        return 'File name cannot start with a dot';
      }

      // Check if already has .md extension
      const finalName = trimmedName.endsWith('.md') || trimmedName.endsWith('.markdown')
        ? trimmedName
        : `${trimmedName}.md`;

      if (existingNames.includes(finalName)) {
        return 'A file with this name already exists';
      }
      return null;
    };

    const handleCreate = () => {
      const validationError = validateFileName(fileName);
      if (validationError) {
        setError(validationError);
        return;
      }

      const trimmedName = fileName.trim();
      // Auto-add .md extension if not present
      const finalName = trimmedName.endsWith('.md') || trimmedName.endsWith('.markdown')
        ? trimmedName
        : `${trimmedName}.md`;
      const fullPath = parentPath ? `${parentPath}/${finalName}` : finalName;

      modal.resolve({
        action: 'created',
        fileName: finalName,
        fullPath,
      } as CreateFileResult);
      modal.hide();
    };

    const handleCancel = () => {
      modal.resolve({ action: 'canceled' } as CreateFileResult);
      modal.hide();
    };

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        handleCancel();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && fileName.trim()) {
        handleCreate();
      }
    };

    const displayPath = parentPath || '(root)';
    const previewName = fileName.trim()
      ? (fileName.trim().endsWith('.md') || fileName.trim().endsWith('.markdown')
        ? fileName.trim()
        : `${fileName.trim()}.md`)
      : '';

    return (
      <Dialog open={modal.visible} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <DialogTitle>Create New File</DialogTitle>
            </div>
            <DialogDescription>
              Create a new markdown file in{' '}
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {displayPath}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., README, notes"
                maxLength={100}
                autoFocus
              />
              {previewName && (
                <p className="text-xs text-muted-foreground">
                  Will be created as:{' '}
                  <span className="font-mono bg-muted px-1 py-0.5 rounded">
                    {previewName}
                  </span>
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!fileName.trim()}>
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export const CreateFileDialog = defineModal<
  CreateFileDialogProps,
  CreateFileResult
>(CreateFileDialogImpl);
