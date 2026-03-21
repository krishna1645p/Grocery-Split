import { useState, useRef, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, UserPlus, X, Mail, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type Participant } from "@/hooks/use-grocery-store";
import { motion, AnimatePresence } from "framer-motion";

interface OrderHeaderProps {
  orderName: string;
  setOrderName: (name: string) => void;
  storeName: string;
  setStoreName: (name: string) => void;
  participants: Participant[];
  addParticipant: (p: Participant) => void;
  removeParticipant: (index: number) => void;
}

export function OrderHeader({
  orderName,
  setOrderName,
  storeName,
  setStoreName,
  participants,
  addParticipant,
  removeParticipant,
}: OrderHeaderProps) {
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [nameError, setNameError] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    addParticipant({ name: trimmedName, email: newEmail.trim() });
    setNewName("");
    setNewEmail("");
    setNameError(false);
    nameRef.current?.focus();
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (newName.trim()) {
        emailRef.current?.focus();
      } else {
        setNameError(true);
      }
    }
  };

  const handleEmailKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Card className="p-6 md:p-8 bg-card border shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <ShoppingBag className="w-64 h-64 -mt-16 -mr-16 text-primary" />
      </div>

      <div className="relative z-10 space-y-8">
        {/* Order Name + Store */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Order Name
            </label>
            <Input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto py-3 bg-white/50 focus-visible:bg-white transition-colors"
              placeholder="E.g., Sunday Prep"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" /> Store Name
            </label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto py-3 bg-white/50 focus-visible:bg-white transition-colors"
              placeholder="E.g., Walmart"
            />
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Participants
              {participants.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                  {participants.length}
                </span>
              )}
            </label>
          </div>

          {/* Add form */}
          <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start">
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    ref={nameRef}
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                    onKeyDown={handleNameKeyDown}
                    placeholder="Name *"
                    className={`pl-9 bg-white ${nameError ? 'border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive' : ''}`}
                    aria-label="Participant name"
                  />
                </div>
                {nameError && (
                  <p className="text-xs text-destructive px-1">Name is required</p>
                )}
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                <Input
                  ref={emailRef}
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="Email (optional)"
                  className="pl-9 bg-white"
                  aria-label="Participant email"
                />
              </div>

              <Button
                type="button"
                onClick={handleAdd}
                className="gap-2 shrink-0 w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground px-0.5">
              If a participant has an email and signs in with Google, they'll automatically see this order in their history.
            </p>
          </div>

          {/* Chips */}
          {participants.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              role="list"
              aria-label="Participants"
            >
              <AnimatePresence>
                {participants.map((p, idx) => (
                  <motion.div
                    key={`${p.name}-${idx}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.75 }}
                    transition={{ duration: 0.15 }}
                    role="listitem"
                    className="group flex items-center gap-2 bg-white border border-border rounded-full pl-3 pr-1 py-1 shadow-sm hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="leading-tight min-w-0">
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      {p.email && (
                        <span className="ml-1.5 text-xs text-muted-foreground hidden sm:inline">
                          {p.email}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParticipant(idx)}
                      className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic px-1">
              No participants added yet — add at least one to start splitting.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
