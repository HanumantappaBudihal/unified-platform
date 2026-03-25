import { NextResponse } from 'next/server';

export async function GET() {
  // Incidents are tracked by Uptime Kuma. This returns an empty array initially.
  // In production, this would proxy to Uptime Kuma's API for incident history.
  return NextResponse.json([]);
}
