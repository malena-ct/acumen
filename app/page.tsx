"use client";

import { useEffect, useState } from 'react';
import Dashboard from './components/dashboard';
import Onboarding from './components/onboarding';
import OrgOnboarding from './components/org-onboarding';
import WhatsAppGuide from './components/whatsapp-guide';
import { isProd } from '@/lib/app-env';

type Stage = 'login' | 'org' | 'dashboard' | 'guide';

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('login');
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(isProd);

  useEffect(() => {
    if (!isProd) return;

    let active = true;

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/status');
        const data = (await res.json()) as { authenticated?: boolean };
        if (active && data.authenticated) {
          setStage('dashboard');
        }
      } catch {
        // Stay on login if session validation fails.
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    if (isProd) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // The client state is still reset below.
      }
    }

    setError('');
    setStage('login');
  }

  function handleAuthSuccess(mode: 'login' | 'register') {
    setError('');
    setStage(mode === 'register' ? 'org' : 'dashboard');
  }

  if (checkingSession) {
    return (
      <main className="center-screen">
        <p>Cargando...</p>
      </main>
    );
  }

  if (stage === 'login') {
    return (
      <main>
        <Onboarding onError={setError} onSuccess={handleAuthSuccess} error={error} />
      </main>
    );
  }

  if (stage === 'org') {
    return (
      <main>
        <OrgOnboarding onFinish={() => setStage('dashboard')} />
      </main>
    );
  }

  if (stage === 'dashboard') {
    return (
      <main>
        <Dashboard onLogout={handleLogout} onConnectWhatsApp={() => setStage('guide')} />
      </main>
    );
  }

  return (
    <main>
      <WhatsAppGuide onLogout={handleLogout} />
    </main>
  );
}
