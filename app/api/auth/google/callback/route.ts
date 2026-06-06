import { NextResponse, type NextRequest } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google';
import { writeSessionCredentials } from '@/lib/session';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const error = searchParams.get('error');
    if (error) {
      return NextResponse.json(
        { error: `Google OAuth error: ${error}` },
        { status: 400 },
      );
    }
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json(
        { error: 'Missing "code" query parameter' },
        { status: 400 },
      );
    }
    const tokens = await exchangeCodeForTokens(code);
    await writeSessionCredentials(tokens);
    return NextResponse.redirect(new URL('/', req.url));
  } catch (err) {
    return errorResponse(err);
  }
}
