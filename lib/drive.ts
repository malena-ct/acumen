import 'server-only';
import type { drive_v3 } from 'googleapis';

export const DEFAULT_FILE_FIELDS =
  'id, name, mimeType, size, modifiedTime, createdTime, parents, owners, webViewLink, iconLink, starred, description';

export const ACUMEN_FOLDER_NAME = 'ACUMEN';
export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

/** Escape a string for safe use inside a Drive v3 query literal. */
export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Find the user's root-level, non-trashed ACUMEN folder, if any.
 * Returns the folder id, or null if it does not exist.
 */
export async function findAcumenFolder(drive: drive_v3.Drive): Promise<string | null> {
  const name = escapeDriveQueryValue(ACUMEN_FOLDER_NAME);
  const q = `name = '${name}' and mimeType = '${FOLDER_MIME_TYPE}' and 'root' in parents and trashed = false`;
  const result = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 1,
    spaces: 'drive',
  });
  const file = result.data.files?.[0];
  return file?.id ?? null;
}

/**
 * Ensure a root-level ACUMEN folder exists for the authenticated user.
 * Returns the folder id, creating it if necessary.
 */
export async function ensureAcumenFolder(drive: drive_v3.Drive): Promise<string> {
  const existing = await findAcumenFolder(drive);
  if (existing) return existing;
  const created = await drive.files.create({
    requestBody: {
      name: ACUMEN_FOLDER_NAME,
      mimeType: FOLDER_MIME_TYPE,
      parents: ['root'],
    },
    fields: 'id',
  });
  const id = created.data.id;
  if (!id) throw new Error('Drive did not return an id for the new ACUMEN folder');
  return id;
}

/**
 * Throws a 403-style error if the given file is not parented under the
 * ACUMEN folder. Reads only the `parents` field for efficiency.
 */
export async function assertFileInAcumen(
  drive: drive_v3.Drive,
  fileId: string,
  acumenFolderId: string,
): Promise<void> {
  const result = await drive.files.get({ fileId, fields: 'id, parents' });
  const parents = result.data.parents ?? [];
  if (!parents.includes(acumenFolderId)) {
    const err = new Error('File is not inside the ACUMEN folder') as Error & {
      status: number;
    };
    err.status = 403;
    throw err;
  }
}

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
