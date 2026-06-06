'use client';

import { useState } from 'react';
import Onboarding from './components/onboarding';
import OrgOnboarding from './components/org-onboarding';
import WhatsAppGuide from './components/whatsapp-guide';
import Dashboard from './components/dashboard';

type Stage = 'login' | 'org' | 'dashboard' | 'guide';

export default function HomePage() {
  const [stage, setStage] = useState<Stage>('login');
  const [error, setError] = useState('');

  function handleLogout() {
    setStage('login');
  }

  function handleAuthSuccess(mode: 'login' | 'register') {
    // New accounts go through org setup; returning users land on the dashboard.
    setStage(mode === 'register' ? 'org' : 'dashboard');
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
