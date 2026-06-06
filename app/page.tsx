'use client';

import { useState } from 'react';
import Onboarding from './components/onboarding';
import WhatsAppGuide from './components/whatsapp-guide';

export default function HomePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  function handleLogout() {
    setAuthenticated(false);
  }

  if (!authenticated) {
    return (
      <main>
        <Onboarding
          onError={setError}
          onSuccess={() => setAuthenticated(true)}
          error={error}
        />
      </main>
    );
  }

  return (
    <main>
      <WhatsAppGuide onLogout={handleLogout} />
    </main>
  );
}
