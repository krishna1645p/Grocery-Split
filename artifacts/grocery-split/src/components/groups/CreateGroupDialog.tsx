// @ts-ignore
import { supabase } from '@/lib/supabase';
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Mail, User, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  name: string;
  email: string;
}

interface CreateGroupDialogProps {
  userId: string;
  userEmail?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGroupDialog({ userId, userEmail, onClose, onCreated }: CreateGroupDialogProps) {
  const defaultMyName = userEmail ? userEmail.split('@')[0] : '';
  const [groupName, setGroupName] = useState('');
  const [myName, setMyName] = useState(defaultMyName);
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [nameError, setNameError] = useState(false);
  const [groupNameError, setGroupNameError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const addMember = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError(true); return; }
    setMembers(prev => [...prev, { name: trimmed, email: newEmail.trim() }]);
    setNewName('');
    setNewEmail('');
    setNameError(false);
    nameRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { setGroupNameError(true); return; }
    setIsCreating(true);
    setError(null);
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: groupName.trim(), created_by: userId })
        .select()
        .single();
      if (groupError) throw groupError;

      const membersPayload = [
        {
          group_id: group.id,
          user_id: userId,
          name: myName.trim() || (userEmail?.split('@')[0] ?? 'Me'),
          email: userEmail ?? null,
        },
        ...members.map(m => ({
          group_id: group.id,
          user_id: null,
          name: m.name,
          email: m.email || null,
        })),
      ];

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersPayload);
      if (membersError) throw membersError;

      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Create New Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Group Name *</label>
            <Input
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); if (e.target.value.trim()) setGroupNameError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="E.g., Apartment 4B, College House"
              className={`text-base ${groupNameError ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
              autoFocus
            />
            {groupNameError && <p className="text-xs text-destructive">Group name is required</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Your Name in This Group</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
              <Input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="Your display name"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-muted-foreground">Invite Other Members</label>
            <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    ref={nameRef}
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); newName.trim() ? emailRef.current?.focus() : setNameError(true); } }}
                    placeholder="Name *"
                    className={`pl-9 bg-white ${nameError ? 'border-destructive' : ''}`}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    ref={emailRef}
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMember(); } }}
                    placeholder="Email (optional)"
                    className="pl-9 bg-white"
                  />
                </div>
                <Button type="button" onClick={addMember} variant="outline" className="gap-1.5 shrink-0">
                  <UserPlus className="w-4 h-4" /> Add
                </Button>
              </div>
              {nameError && <p className="text-xs text-destructive">Name is required</p>}
              <p className="text-xs text-muted-foreground">
                Members with emails automatically see group orders when they sign in with Google.
              </p>
            </div>

            {members.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {members.map((m, idx) => (
                    <motion.div
                      key={`${m.name}-${idx}`}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.75 }}
                      transition={{ duration: 0.13 }}
                      className="flex items-center gap-2 bg-white border border-border rounded-full pl-3 pr-1 py-1 shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold">{m.name}</span>
                      {m.email && <span className="text-xs text-muted-foreground hidden sm:inline">{m.email}</span>}
                      <button
                        type="button"
                        onClick={() => setMembers(prev => prev.filter((_, i) => i !== idx))}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating} className="gap-2 min-w-[130px]">
            {isCreating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : 'Create Group'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
