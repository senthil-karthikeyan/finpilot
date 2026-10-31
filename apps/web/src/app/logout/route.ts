import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';

export async function POST() {
  const response = NextResponse.json(
    { message: 'Logged out successfully.' },
    { status: 200 },
  );

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

