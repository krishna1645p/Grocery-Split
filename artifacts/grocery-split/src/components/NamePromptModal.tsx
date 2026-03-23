import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Smile } from "lucide-react";

interface NamePromptModalProps {
  defaultName: string;
  onSave: (name: string) => Promise<void>;
}

export function NamePromptModal({ defaultName, onSave }: NamePromptModalProps) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-2xl p-8 w-full max-w-sm shadow-lg text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-2xl">
            <Smile className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">What should we call you?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              This name will be shown to your group members.
            </p>
          </div>
        </div>

        <div className="space-y-2 text-left">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            className={`h-11 text-base ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 text-sm font-semibold gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save & continue'}
        </Button>
      </div>
    </div>
  );
}
