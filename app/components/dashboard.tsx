'use client';

import { useState } from 'react';

interface DashboardProps {
  onLogout: () => void;
  onConnectWhatsApp: () => void;
}

interface Conversation {
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread: number;
}

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    name: 'María González',
    initials: 'MG',
    preview: 'Muchas gracias por la ayuda con los trámites 🙏',
    time: '10:24',
    unread: 2,
  },
  {
    name: 'Comedor Los Pinos',
    initials: 'CP',
    preview: '¿Pueden pasar mañana a retirar las donaciones?',
    time: '09:51',
    unread: 0,
  },
  {
    name: 'Juan Pérez',
    initials: 'JP',
    preview: 'Perfecto, nos vemos el jueves entonces.',
    time: 'Ayer',
    unread: 0,
  },
  {
    name: 'Grupo de Voluntarios',
    initials: 'GV',
    preview: 'Ana: Yo puedo cubrir el turno de la tarde',
    time: 'Ayer',
    unread: 5,
  },
];

const SAMPLE_STATS = [
  { label: 'Conversaciones activas', value: '24' },
  { label: 'Mensajes esta semana', value: '187' },
  { label: 'Personas acompañadas', value: '63' },
  { label: 'Voluntarios en el equipo', value: '8' },
];

export default function Dashboard({ onLogout, onConnectWhatsApp }: DashboardProps) {
  // Demo toggle: in a real app this comes from the backend.
  const [hasData, setHasData] = useState(false);

  return (
    <div className="dash-shell">
      <header className="dash-topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WhatsAppGlyph color="var(--accent-strong)" />
          </span>
          Acumen
        </div>

        <div className="dash-topbar-right">
          <button
            type="button"
            className="demo-toggle"
            onClick={() => setHasData((v) => !v)}
            title="Demostración: alterna entre el estado vacío y con datos"
          >
            {hasData ? 'Ver estado vacío' : 'Ver con datos'}
          </button>
          <div className="dash-user" aria-hidden="true">
            <span className="avatar">AC</span>
          </div>
          <button type="button" className="secondary" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dash-body">
        {hasData ? (
          <PopulatedState onConnectWhatsApp={onConnectWhatsApp} />
        ) : (
          <EmptyState onConnectWhatsApp={onConnectWhatsApp} />
        )}
      </main>
    </div>
  );
}

function EmptyState({ onConnectWhatsApp }: { onConnectWhatsApp: () => void }) {
  return (
    <div className="dash-empty">
      <div className="dash-empty-head">
        <span className="dash-empty-icon" aria-hidden="true">
          <WhatsAppGlyph color="var(--accent-strong)" />
        </span>
        <h1>¡Hola de nuevo! Pongamos todo en marcha</h1>
        <p>
          Tu organización todavía no tiene actividad. Completa estos primeros pasos para empezar a
          acompañar a tu comunidad por WhatsApp.
        </p>
      </div>

      <ul className="action-grid">
        <li className="action-card">
          <span className="action-icon" aria-hidden="true">
            <WhatsAppGlyph color="var(--accent-strong)" />
          </span>
          <div className="action-text">
            <h3>Conecta WhatsApp</h3>
            <p>Vincula tu número para empezar a recibir y responder mensajes desde Acumen.</p>
          </div>
          <button type="button" className="block" onClick={onConnectWhatsApp}>
            Conectar ahora
          </button>
        </li>

        <li className="action-card">
          <span className="action-icon" aria-hidden="true">
            <PeopleGlyph />
          </span>
          <div className="action-text">
            <h3>Invita a tu equipo</h3>
            <p>Suma a las personas voluntarias para que atiendan las conversaciones juntas.</p>
          </div>
          <button type="button" className="secondary block" disabled>
            Invitar (próximamente)
          </button>
        </li>

        <li className="action-card">
          <span className="action-icon" aria-hidden="true">
            <FolderGlyph />
          </span>
          <div className="action-text">
            <h3>Importa tu información</h3>
            <p>Conecta una carpeta de Google Drive para traer los datos que ya tienes.</p>
          </div>
          <button type="button" className="secondary block" disabled>
            Importar (próximamente)
          </button>
        </li>
      </ul>
    </div>
  );
}

function PopulatedState({ onConnectWhatsApp }: { onConnectWhatsApp: () => void }) {
  return (
    <div className="dash-data">
      <div className="dash-data-head">
        <div>
          <h1>Hola, Fundación Manos Unidas</h1>
          <p className="muted">Este es el resumen de la actividad de tu organización.</p>
        </div>
        <button type="button" onClick={onConnectWhatsApp}>
          Ver guía de WhatsApp
        </button>
      </div>

      <ul className="stat-grid">
        {SAMPLE_STATS.map((s) => (
          <li key={s.label} className="stat-card">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </li>
        ))}
      </ul>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Conversaciones recientes</h2>
          <span className="muted">Actualizado hace un momento</span>
        </div>
        <ul className="conv-list">
          {SAMPLE_CONVERSATIONS.map((c) => (
            <li key={c.name} className="conv">
              <span className="conv-avatar" aria-hidden="true">
                {c.initials}
              </span>
              <div className="conv-info">
                <div className="conv-top">
                  <span className="conv-name">{c.name}</span>
                  <span className="conv-time">{c.time}</span>
                </div>
                <span className="conv-preview">{c.preview}</span>
              </div>
              {c.unread > 0 && <span className="conv-badge">{c.unread}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function WhatsAppGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a10 10 0 0 0-8.66 15l-1.3 4.75 4.87-1.28A10 10 0 1 0 12 2Zm5.3 14.06c-.22.63-1.27 1.2-1.78 1.25-.46.05-1.03.07-1.66-.1-.38-.12-.87-.28-1.5-.55-2.64-1.14-4.36-3.8-4.5-3.98-.13-.18-1.07-1.42-1.07-2.71s.68-1.92.92-2.19c.24-.26.52-.33.7-.33.17 0 .35 0 .5.01.16.01.38-.06.59.45.22.52.74 1.8.8 1.93.07.13.11.28.02.46-.09.18-.13.28-.26.44-.13.15-.27.34-.39.46-.13.13-.26.27-.11.53.15.26.66 1.09 1.42 1.76.97.87 1.79 1.13 2.05 1.26.26.13.41.11.56-.07.15-.18.65-.76.82-1.02.17-.26.35-.22.59-.13.24.09 1.52.72 1.78.85.26.13.43.2.5.31.06.11.06.66-.16 1.29Z"
        fill={color}
      />
    </svg>
  );
}

function PeopleGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.67 0-8 1.34-8 4v2h9.5a5.5 5.5 0 0 1 1.9-3.78A11 11 0 0 0 8 13Zm8 0c-.35 0-.74.02-1.16.06A5 5 0 0 1 17 17v2h7v-2c0-2.66-5.33-4-8-4Z"
        fill="var(--accent-strong)"
      />
    </svg>
  );
}

function FolderGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z"
        fill="var(--accent-strong)"
      />
    </svg>
  );
}
