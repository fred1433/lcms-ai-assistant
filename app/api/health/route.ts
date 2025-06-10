import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 10; 

export function GET() {
  console.log('--- HEALTH CHECK: THIS LOG MUST APPEAR ---');
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
} 