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
import { Folder } from 'lucide-react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { defineModal } from '@/lib/modals';

export interface CreateFolderDialogProps {
  parentPath?: string;
  existingNames?: string[];
}

export type CreateFolderResult = {
  action: 'created' | 'canceled';
  folderName?: string;
  fullPath?: string;
};

const CreateFolderDialogImpl = NiceModal.create<CreateFolderDialogProps>(
  ({ parentPath = '', existingNames = [] }) => {
    const modal = useModal();
    const [folderName, setFolderName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (modal.visible) {
        setFolderName('');
        setError(null);
      }
    }, [modal.visible]);

    const validateFolderName = (name: string): string | null => {
      const trimmedName = name.trim();
      if (!trimmedName) return 'Folder name cannot be empty';
      if (trimmedName.length > 100)
        return 'Folder name must be 100 characters or less';
      if (/[<>:"/\\|?*]/.test(trimmedName)) {
        return 'Folder name contains invalid characters';
      }
      if (trimmedName.startsWith('.')) {
        return 'Folder name cannot start with a dot';
      }
      if (existingNames.includes(trimmedName)) {
        return 'A folder with this name already exists';
      }
      return null;
    };

    const handleCreate = () => {
      const validationError = validateFolderName(folderName);
      if (validationError) {
        setError(validationError);
        return;
      }

      const trimmedName = folderName.trim();
      const fullPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

      modal.resolve({
        action: 'created',
        folderName: trimmedName,
        fullPath,
      } as CreateFolderResult);
      modal.hide();
    };

    const handleCancel = () => {
      modal.resolve({ action: 'canceled' } as CreateFolderResult);
      modal.hide();
    };

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        handleCancel();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && folderName.trim()) {
        handleCreate();
      }
    };

    const displayPath = parentPath || '(root)';

    return (
      <Dialog open={modal.visible} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-amber-500" />
              <DialogTitle>Create New Folder</DialogTitle>
            </div>
            <DialogDescription>
              Create a new folder in{' '}
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {displayPath}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., docs, notes"
                maxLength={100}
                autoFocus
              />
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
            <Button onClick={handleCreate} disabled={!folderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export const CreateFolderDialog = defineModal<
  CreateFolderDialogProps,
  CreateFolderResult
>(CreateFolderDialogImpl);
