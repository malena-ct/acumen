import { NextResponse, type NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { getDriveClient } from '@/lib/google';
import { DEFAULT_FILE_FIELDS, nonEmpty, parsePageSize } from '@/lib/drive';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const drive = await getDriveClient();
    const { searchParams } = req.nextUrl;
    const query = nonEmpty(searchParams.get('query'));
    const pageToken = nonEmpty(searchParams.get('pageToken'));
    const pageSize = parsePageSize(searchParams.get('pageSize'));

    const result = await drive.files.list({
      pageSize,
      pageToken,
      q: query,
      fields: `nextPageToken, files(${DEFAULT_FILE_FIELDS})`,
      spaces: 'drive',
    });

    return NextResponse.json({
      files: result.data.files ?? [],
      nextPageToken: result.data.nextPageToken ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing "file" field in multipart upload' },
        { status: 400 },
      );
    }
    const drive = await getDriveClient();

    const fallbackName = file.name && file.name.length > 0 ? file.name : 'untitled';
    const name = nonEmpty(form.get('name')?.toString() ?? null) ?? fallbackName;
    const parentId = nonEmpty(form.get('parentId')?.toString() ?? null);
    const mimeType = file.type || 'application/octet-stream';

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await drive.files.create({
      requestBody: {
        name,
        mimeType,
        parents: parentId ? [parentId] : undefined,
      },
      media: {
        mimeType,
        body: Readable.from(buf),
      },
      fields: DEFAULT_FILE_FIELDS,
    });

    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
