import { NextResponse, type NextRequest } from 'next/server';
import { getDriveClient } from '@/lib/google';
import { DEFAULT_FILE_FIELDS, nonEmpty } from '@/lib/drive';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ fileId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { fileId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const requestBody: Record<string, unknown> = {};
    if (typeof body.name === 'string') requestBody.name = body.name;
    if (typeof body.description === 'string') requestBody.description = body.description;
    if (typeof body.starred === 'boolean') requestBody.starred = body.starred;
    if (typeof body.mimeType === 'string') requestBody.mimeType = body.mimeType;
    if (
      body.appProperties &&
      typeof body.appProperties === 'object' &&
      !Array.isArray(body.appProperties)
    ) {
      requestBody.appProperties = body.appProperties;
    }

    if (Object.keys(requestBody).length === 0) {
      return NextResponse.json(
        {
          error:
            'Provide at least one of: name, description, starred, mimeType, appProperties',
        },
        { status: 400 },
      );
    }

    const drive = await getDriveClient();
    const addParents = nonEmpty(
      typeof body.addParents === 'string' ? body.addParents : null,
    );
    const removeParents = nonEmpty(
      typeof body.removeParents === 'string' ? body.removeParents : null,
    );

    const result = await drive.files.update({
      fileId,
      requestBody,
      addParents,
      removeParents,
      fields: DEFAULT_FILE_FIELDS,
    });
    return NextResponse.json(result.data);
  } catch (err) {
    return errorResponse(err);
  }
}
