import { Router, type Request, type Response, type NextFunction } from 'express';
import { Readable } from 'stream';
import multer from 'multer';
import { getDriveClient } from '../google';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB hackathon cap
  },
});

export const driveRouter = Router();

const DEFAULT_FILE_FIELDS =
  'id, name, mimeType, size, modifiedTime, createdTime, parents, owners, webViewLink, iconLink, starred, description';

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function parsePageSize(raw: unknown): number {
  const fallback = 25;
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(1000, n));
}

function bufferToStream(buf: Buffer): Readable {
  return Readable.from(buf);
}

// GET /drive/files?query=...&pageSize=...&pageToken=...
driveRouter.get('/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drive = await getDriveClient();
    const query = asString(req.query.query);
    const pageToken = asString(req.query.pageToken);
    const pageSize = parsePageSize(req.query.pageSize);

    const result = await drive.files.list({
      pageSize,
      pageToken,
      q: query,
      fields: `nextPageToken, files(${DEFAULT_FILE_FIELDS})`,
      spaces: 'drive',
    });

    res.json({
      files: result.data.files ?? [],
      nextPageToken: result.data.nextPageToken ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /drive/files/:fileId  (metadata)
driveRouter.get('/files/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drive = await getDriveClient();
    const result = await drive.files.get({
      fileId: req.params.fileId,
      fields: DEFAULT_FILE_FIELDS,
    });
    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

// Map Google Workspace mime types to an export mime type.
const EXPORT_MAP: Record<string, { mime: string; ext: string }> = {
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

// GET /drive/files/:fileId/content
driveRouter.get(
  '/files/:fileId/content',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const drive = await getDriveClient();
      const meta = await drive.files.get({
        fileId: req.params.fileId,
        fields: 'id, name, mimeType',
      });
      const mimeType = meta.data.mimeType ?? 'application/octet-stream';
      const name = meta.data.name ?? meta.data.id ?? 'file';

      if (EXPORT_MAP[mimeType]) {
        const exportInfo = EXPORT_MAP[mimeType];
        const overrideMime = asString(req.query.mimeType) ?? exportInfo.mime;
        const result = await drive.files.export(
          { fileId: req.params.fileId, mimeType: overrideMime },
          { responseType: 'stream' },
        );
        res.setHeader('Content-Type', overrideMime);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(name)}.${exportInfo.ext}"`,
        );
        result.data.on('error', next);
        result.data.pipe(res);
        return;
      }

      const result = await drive.files.get(
        { fileId: req.params.fileId, alt: 'media' },
        { responseType: 'stream' },
      );
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(name)}"`,
      );
      result.data.on('error', next);
      result.data.pipe(res);
    } catch (err) {
      next(err);
    }
  },
);

// POST /drive/files  (multipart/form-data: file=<binary>, name?, parentId?)
driveRouter.post(
  '/files',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Missing "file" field in multipart upload' });
        return;
      }
      const drive = await getDriveClient();
      const name = asString(req.body?.name) ?? req.file.originalname ?? 'untitled';
      const parentId = asString(req.body?.parentId);
      const mimeType = req.file.mimetype || 'application/octet-stream';

      const result = await drive.files.create({
        requestBody: {
          name,
          mimeType,
          parents: parentId ? [parentId] : undefined,
        },
        media: {
          mimeType,
          body: bufferToStream(req.file.buffer),
        },
        fields: DEFAULT_FILE_FIELDS,
      });

      res.status(201).json(result.data);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /drive/files/:fileId  (replace content via multipart/form-data, optional name)
driveRouter.put(
  '/files/:fileId',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Missing "file" field in multipart upload' });
        return;
      }
      const drive = await getDriveClient();
      const name = asString(req.body?.name);
      const mimeType = req.file.mimetype || 'application/octet-stream';

      const result = await drive.files.update({
        fileId: req.params.fileId,
        requestBody: name ? { name } : undefined,
        media: {
          mimeType,
          body: bufferToStream(req.file.buffer),
        },
        fields: DEFAULT_FILE_FIELDS,
      });

      res.json(result.data);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /drive/files/:fileId/metadata
driveRouter.patch(
  '/files/:fileId/metadata',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const requestBody: Record<string, unknown> = {};
      if (typeof body.name === 'string') requestBody.name = body.name;
      if (typeof body.description === 'string') requestBody.description = body.description;
      if (typeof body.starred === 'boolean') requestBody.starred = body.starred;
      if (typeof body.mimeType === 'string') requestBody.mimeType = body.mimeType;
      if (Array.isArray(body.appProperties)) {
        // ignore — appProperties must be an object map
      } else if (
        body.appProperties &&
        typeof body.appProperties === 'object'
      ) {
        requestBody.appProperties = body.appProperties;
      }

      if (Object.keys(requestBody).length === 0) {
        res
          .status(400)
          .json({ error: 'Provide at least one of: name, description, starred, mimeType, appProperties' });
        return;
      }

      const drive = await getDriveClient();
      const addParents = asString(body.addParents);
      const removeParents = asString(body.removeParents);

      const result = await drive.files.update({
        fileId: req.params.fileId,
        requestBody,
        addParents,
        removeParents,
        fields: DEFAULT_FILE_FIELDS,
      });
      res.json(result.data);
    } catch (err) {
      next(err);
    }
  },
);
