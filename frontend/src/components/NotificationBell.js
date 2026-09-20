import React, { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { api } from "../lib/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef();

  const loadCount = () => api.get("/notifications/unread-count").then(({ data }) => setUnread(data.count)).catch(() => {});
  const loadList = () => api.get("/notifications").then(({ data }) => setItems(data)).catch(() => {});

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const markAll = async () => {
    await api.post("/notifications/read-all");
    setUnread(0);
    setItems((s) => s.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative text-slate-500 hover:text-emerald-700 transition-colors" data-testid="notif-bell">
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center" data-testid="notif-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in" data-testid="notif-panel">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-heading font-bold text-sm">Notifikasi</span>
            <div className="flex items-center gap-2">
              {items.some((n) => !n.is_read) && <button onClick={markAll} className="text-xs text-emerald-600 font-semibold hover:underline" data-testid="notif-mark-all">Tandai dibaca</button>}
              <button onClick={() => setOpen(false)} className="text-slate-400"><X size={16} /></button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 text-sm">Belum ada notifikasi</div>
            ) : items.map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-slate-50 ${n.is_read ? "" : "bg-emerald-50/50"}`} data-testid={`notif-item-${n.id}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />}
                  <div className={n.is_read ? "pl-4" : ""}>
                    <div className="font-semibold text-sm text-ink">{n.judul}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{n.pesan}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">{n.created_at?.slice(0, 16).replace("T", " ")}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
