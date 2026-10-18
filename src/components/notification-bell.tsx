"use client";
import Link from "next/link";
import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { notificationChannel, notificationEvent, notificationLocalEvent, refreshCollaborationPage } from "@/lib/realtime/channels";

type Handler = (payload?: unknown) => void;
type RealtimeChannel = { bind(event: string, handler: Handler): void; unbind(event: string, handler: Handler): void };
type RealtimeClient = { connection: RealtimeChannel; subscribe(channel: string): RealtimeChannel; unsubscribe(channel: string): void; disconnect(): void };
type Authorization = { socketId: string; channelName: string };
type AuthCallback = (error: Error | null, result: { auth: string } | null) => void;
declare global {
  interface Window {
    Pusher?: new (key: string, options: {
      cluster: string; forceTLS: boolean;
      channelAuthorization: { customHandler: (params: Authorization, callback: AuthCallback) => void };
    }) => RealtimeClient;
  }
}
export function NotificationBell({ initialUnread, userId, pusher }: {
  initialUnread: number; userId: string; pusher: { key: string; cluster: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  const lastUnread = useRef(initialUnread);
  const [live, setLive] = useState<{ userId: string; unread: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const unread = live?.userId === userId ? live.unread : initialUnread;
  const key = pusher?.key;
  const cluster = pusher?.cluster;
  useEffect(() => { path.current = pathname; }, [pathname]);
  useEffect(() => { lastUnread.current = initialUnread; }, [initialUnread, userId]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true, busy = false, queued = false, announceNext = false, subscribed = false, polls = 0;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let client: RealtimeClient | undefined;
    let channel: RealtimeChannel | undefined;
    async function refresh() {
      if (!active || document.visibilityState !== "visible") return;
      if (busy) { queued = true; return; }
      busy = true;
      const announce = announceNext;
      announceNext = false;
      try {
        const response = await fetch("/api/notifications?summary=1", { signal: controller.signal, cache: "no-store" });
        if (response.status === 401 || response.status === 403) {
          client?.disconnect(); subscribed = false;
          if (active) { setLive({ userId, unread: 0 }); setNotice(null); }
          return;
        }
        if (!response.ok) return;
        const body = await response.json();
        const count: unknown = body.data?.unread;
        if (!active || typeof count !== "number" || !Number.isInteger(count) || count < 0) return;
        if (announce && count > lastUnread.current) {
          setNotice(userId);
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setNotice(null), 7000);
        }
        lastUnread.current = count;
        setLive({ userId, unread: count });
        if (path.current === "/notifications" || refreshCollaborationPage(path.current)) router.refresh();
      } catch { /* Reconnection or the next fallback poll reconciles database state. */ }
      finally { busy = false; if (queued && active) { queued = false; void refresh(); } }
    }
    function schedule(announce = false) {
      announceNext ||= announce;
      clearTimeout(debounce);
      debounce = setTimeout(() => { void refresh(); }, 150);
    }
    const changed = () => schedule(true);
    const localChanged = () => schedule();
    const connected = () => { subscribed = true; schedule(); };
    const unavailable = () => { subscribed = false; };
    const connectionChanged = (state: unknown) => {
      if (state && typeof state === "object" && "current" in state && state.current !== "connected") subscribed = false;
    };
    const visibility = () => { if (document.visibilityState === "visible") schedule(); };
    if (sdkReady && window.Pusher && key && cluster) {
      client = new window.Pusher(key, {
        cluster, forceTLS: true,
        channelAuthorization: {
          customHandler: (params, callback) => {
            void fetch("/api/pusher/auth", {
              method: "POST", signal: controller.signal,
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ socket_id: params.socketId, channel_name: params.channelName }),
            }).then(async (response) => {
              const body = await response.json();
              if (!response.ok || typeof body.data?.auth !== "string") throw new Error("Notification subscription unavailable.");
              if (active) callback(null, body.data);
            }).catch(() => { if (active) callback(new Error("Notification subscription unavailable."), null); });
          },
        },
      });
      channel = client.subscribe(notificationChannel(userId));
      channel.bind(notificationEvent, changed);
      channel.bind("pusher:subscription_succeeded", connected);
      channel.bind("pusher:subscription_error", unavailable);
      client.connection.bind("state_change", connectionChanged);
    }
    const timer = setInterval(() => {
      polls += 1;
      if (!subscribed || polls % 4 === 0) void refresh();
    }, 30_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener(notificationLocalEvent, localChanged);
    void refresh();
    return () => {
      active = false; controller.abort();
      clearInterval(timer); clearTimeout(debounce); clearTimeout(toastTimer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener(notificationLocalEvent, localChanged);
      channel?.unbind(notificationEvent, changed);
      channel?.unbind("pusher:subscription_succeeded", connected);
      channel?.unbind("pusher:subscription_error", unavailable);
      client?.connection.unbind("state_change", connectionChanged);
      client?.unsubscribe(notificationChannel(userId)); client?.disconnect();
    };
  }, [userId, key, cluster, sdkReady, router]);
  return <>
    {pusher && <Script id="kolvia-pusher-sdk" src="https://js.pusher.com/8.3.0/pusher.min.js" strategy="afterInteractive" onReady={() => setSdkReady(true)} />}
    <Link href="/notifications" className="relative inline-flex p-1 text-ink" aria-label={`Thông báo: ${unread} chưa đọc`}>
      <Icon name="bell" size={21} />
      {unread > 0 && <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
    {notice === userId && createPortal(<div role="status" className={`fixed bottom-5 ${pathname === "/" ? "left-5" : "right-5"} z-50 flex max-w-[calc(100vw-40px)] items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-xl`}>
      <Icon name="bell" size={20} />
      <Link href="/notifications" className="text-sm font-medium text-primary" onClick={() => setNotice(null)}>Bạn có thông báo mới</Link>
      <button type="button" className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-low" aria-label="Ẩn thông báo" onClick={() => setNotice(null)}><Icon name="close" size={16} /></button>
    </div>, document.body)}
  </>;
}
