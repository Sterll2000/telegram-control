"use client";

import { useEffect, useState } from 'react';
import Dashboard from '@/components/dashboard';

function telegramInitData() {
  const webApp = (globalThis as any).Telegram?.WebApp;
  const direct = typeof webApp?.initData === 'string' ? webApp.initData.trim() : '';
  if (direct) return direct;

  const read = (value: string) => {
    if (!value) return '';
    try {
      const params = new URLSearchParams(value.replace(/^#/, '').replace(/^\?/, ''));
      return params.get('tgWebAppData') || '';
    } catch {
      return '';
    }
  };

  return read(window.location.hash) || read(window.location.search);
}

async function authenticate() {
  const initData = telegramInitData();
  if (!initData) return false;

  const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Telegram authentication failed (${response.status})`);
  }

  return true;
}

export default function Page() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const run = async () => {
      try {
        const webApp = (globalThis as any).Telegram?.WebApp;
        webApp?.ready?.();
        webApp?.expand?.();

        if (!telegramInitData() && attempts < 12) {
          attempts += 1;
          timer = window.setTimeout(run, 150);
          return;
        }

        await authenticate();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Telegram authentication failed');
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return <div className="app-bg min-h-screen grid place-items-center"><div className="glass rounded-3xl p-6 animate-pulse">Подключение к Telegram…</div></div>;
  }

  if (error) {
    return (
      <div className="app-bg min-h-screen grid place-items-center p-5">
        <div className="glass w-full max-w-md rounded-3xl p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-400/10 text-2xl">⚠️</div>
          <h1 className="text-xl font-black">Не удалось войти через Telegram</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">{error}</p>
          <p className="mt-4 text-xs leading-5 text-white/35">Проверьте TELEGRAM_BOT_TOKEN в Vercel и откройте Mini App заново из Telegram.</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
