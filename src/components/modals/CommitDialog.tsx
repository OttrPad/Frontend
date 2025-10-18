import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GitCommit, Loader2 } from "lucide-react";

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string, notes?: string) => Promise<void>;
  isMilestone?: boolean;
}

export function CommitDialog({
  isOpen,
  onClose,
  onCommit,
  isMilestone = false,
}: CommitDialogProps) {
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass notes as separate parameter for milestones
      if (isMilestone) {
        await onCommit(message.trim(), notes.trim() || undefined);
      } else {
        await onCommit(message.trim());
      }
      setMessage("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Failed to create commit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage("");
      setNotes("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onClose={handleClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-orange-500" />
            {isMilestone ? "Create Milestone" : "Create Commit"}
          </DialogTitle>
          <DialogDescription>
            {isMilestone
              ? "Save a milestone to mark an important version of your work. Only owners can create milestones."
              : "Save the current state of your notebook with a descriptive message."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="commit-message">
                {isMilestone ? "Milestone Name" : "Commit Message"} *
              </Label>
              <Input
                id="commit-message"
                placeholder={
                  isMilestone
                    ? "e.g., v1.0 - Initial Release"
                    : "e.g., Added user authentication logic"
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
              />
            </div>

            {isMilestone && (
              <div className="grid gap-2">
                <Label htmlFor="commit-notes">Notes (Optional)</Label>
                <textarea
                  id="commit-notes"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Additional notes about this milestone..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>
                This will capture the current state of all blocks in the
                notebook.
              </p>
              {isMilestone && (
                <p className="mt-1 text-orange-500">
                  ⚠️ Milestones create a Git tag and cannot be deleted.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isMilestone ? "Creating..." : "Committing..."}
                </>
              ) : (
                <>
                  <GitCommit className="mr-2 h-4 w-4" />
                  {isMilestone ? "Create Milestone" : "Commit"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
