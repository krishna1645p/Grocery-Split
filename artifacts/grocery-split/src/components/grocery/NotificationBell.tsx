// @ts-ignore
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── Types ───────── */

interface Notification {
  id: string;
  type: "order_generated" | "balance_due";
  message: string;
  read: boolean;
  created_at: string;
  group_id: string;
  alert_id: string | null;
  order_id: string | null;
}

interface NotificationBellProps {
  userId: string;
}

/* ───────── Helpers ───────── */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function NotifIcon({ type }: { type: Notification["type"] }) {
  if (type === "order_generated")
    return (
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <ShoppingBag className="w-4 h-4" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
      <Wallet className="w-4 h-4" />
    </div>
  );
}

/* ───────── Main Component ───────── */

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alert_notifications")
        .select(
          "id, type, message, read, created_at, group_id, alert_id, order_id",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setNotifications((data as Notification[]) ?? []);
    } catch {
      // silently fail — bell is non-critical
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch + poll every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await supabase
      .from("alert_notifications")
      .update({ read: true })
      .eq("id", id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("alert_notifications")
      .update({ read: true })
      .in("id", unreadIds);
  };

  const dismissNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("alert_notifications").delete().eq("id", id);
  };

  const handleOpen = () => {
    setOpen((p) => !p);
    // Mark all as read when opening
    if (!open && unreadCount > 0) {
      // Slight delay so badge animates out after dropdown opens
      setTimeout(() => markAllAsRead(), 600);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative p-2 rounded-lg transition-colors ${
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border rounded-2xl shadow-xl overflow-hidden z-50"
          >
            {/* Dropdown header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary/30">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto divide-y">
              {loading && notifications.length === 0 && (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                  Loading...
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                    <BellOff className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    No notifications yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll be notified when orders are auto-generated or
                    balances are due.
                  </p>
                </div>
              )}

              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 group transition-colors ${
                    !notif.read
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-secondary/30"
                  }`}
                >
                  <NotifIcon type={notif.type} />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${!notif.read ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t bg-secondary/20 text-center">
                <p className="text-xs text-muted-foreground">
                  Showing last {notifications.length} notification
                  {notifications.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
