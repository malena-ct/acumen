import 'server-only';

export const DEFAULT_FILE_FIELDS =
  'id, name, mimeType, size, modifiedTime, createdTime, parents, owners, webViewLink, iconLink, starred, description';

export const EXPORT_MAP: Record<string, { mime: string; ext: string }> = {
  'application/vnd.google-apps.document': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
  },
  'application/vnd.google-apps.presentation': {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ext: 'pptx',
  },
  'application/vnd.google-apps.drawing': {
    mime: 'image/png',
    ext: 'png',
  },
  'application/vnd.google-apps.script': {
    mime: 'application/vnd.google-apps.script+json',
    ext: 'json',
  },
};

export function parsePageSize(raw: string | null): number {
  const fallback = 25;
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(1000, n));
}

export function nonEmpty(v: string | null | undefined): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
