'use client';

import { useCallback, useEffect, useState } from 'react';

interface DriveFile {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  size?: string | null;
  modifiedTime?: string | null;
  webViewLink?: string | null;
}

interface ListResponse {
  files: DriveFile[];
  nextPageToken: string | null;
}

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed with ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

function formatBytes(raw: string | null | undefined): string {
  if (!raw) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function HomePage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [query, setQuery] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await jsonFetch<{ authenticated: boolean }>('/api/auth/status');
      setAuthenticated(data.authenticated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: '25' });
      if (query.trim()) params.set('query', query.trim());
      const data = await jsonFetch<ListResponse>(`/api/drive/files?${params}`);
      setFiles(data.files ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingFiles(false);
    }
  }, [query]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (authenticated) {
      void loadFiles();
    }
  }, [authenticated, loadFiles]);

  async function handleSignIn() {
    try {
      const data = await jsonFetch<{ url: string }>('/api/auth/google?redirect=0');
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleLogout() {
    try {
      await jsonFetch('/api/auth/logout', { method: 'POST' });
      setAuthenticated(false);
      setFiles([]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('name', uploadFile.name);
      const res = await fetch('/api/drive/files', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed with ${res.status}`);
      }
      setUploadFile(null);
      const input = document.getElementById('upload-input') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadFiles();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRename(file: DriveFile) {
    if (!file.id) return;
    const next = window.prompt('New name', file.name ?? '');
    if (!next || next === file.name) return;
    setRenaming(file.id);
    setError(null);
    try {
      await jsonFetch(`/api/drive/files/${encodeURIComponent(file.id)}/metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      await loadFiles();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRenaming(null);
    }
  }

  if (!authChecked) {
    return (
      <main className="container">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>halketon</h1>
          <div className="muted">Google Drive OAuth playground</div>
        </div>
        <div className="row">
          {authenticated ? (
            <button className="secondary" onClick={handleLogout}>
              Sign out
            </button>
          ) : (
            <button onClick={handleSignIn}>Sign in with Google</button>
          )}
        </div>
      </header>

      {error && (
        <div className="section card error" role="alert">
          {error}
        </div>
      )}

      {!authenticated ? (
        <section className="section card">
          <h2>Not signed in</h2>
          <p className="muted">
            Click <strong>Sign in with Google</strong> to grant access to the Drive
            scopes configured on the server.
          </p>
        </section>
      ) : (
        <>
          <section className="section card">
            <h2>Upload</h2>
            <form onSubmit={handleUpload} className="row">
              <input
                id="upload-input"
                type="file"
                onChange={(e) => setUploadFile(e.currentTarget.files?.[0] ?? null)}
                disabled={uploading}
              />
              <button type="submit" disabled={!uploadFile || uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          </section>

          <section className="section card">
            <h2>Files</h2>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                void loadFiles();
              }}
            >
              <input
                type="text"
                placeholder="Drive search query (optional)"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                style={{ flex: 1, minWidth: 240 }}
              />
              <button type="submit" disabled={loadingFiles}>
                {loadingFiles ? 'Loading…' : 'Search'}
              </button>
            </form>

            <div className="file-list">
              {files.length === 0 && !loadingFiles && (
                <div className="muted">No files yet.</div>
              )}
              {files.map((file) => (
                <div key={file.id ?? Math.random()} className="file-row">
                  <div>
                    <div>
                      <strong>{file.name ?? '(unnamed)'}</strong>
                    </div>
                    <div className="file-meta">
                      {file.mimeType ?? ''}
                      {file.size ? ` · ${formatBytes(file.size)}` : ''}
                      {file.modifiedTime ? ` · modified ${file.modifiedTime}` : ''}
                    </div>
                  </div>
                  <div className="row">
                    {file.webViewLink && (
                      <a href={file.webViewLink} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    )}
                    {file.id && (
                      <a href={`/api/drive/files/${encodeURIComponent(file.id)}/content`}>
                        Download
                      </a>
                    )}
                    <button
                      className="secondary"
                      onClick={() => handleRename(file)}
                      disabled={renaming === file.id}
                    >
                      {renaming === file.id ? 'Renaming…' : 'Rename'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
