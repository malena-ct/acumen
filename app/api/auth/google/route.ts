import { NextResponse, type NextRequest } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  try {
    const url = getAuthUrl();
    if (req.nextUrl.searchParams.get('redirect') === '0') {
      return NextResponse.json({ url });
    }
    return NextResponse.redirect(url);
  } catch (err) {
    return errorResponse(err);
  }
}
