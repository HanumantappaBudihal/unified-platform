export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { scanKeys } from '@/lib/redis';

export async function GET() {
  try {
    const apps = await Promise.all(
      config.apps.map(async (app) => {
        const keys = await scanKeys(`${app.prefix}*`);
        return {
          id: app.id,
          name: app.name,
          prefix: app.prefix,
          keyCount: keys.length,
          color: app.color,
          description: app.description,
        };
      })
    );

    return NextResponse.json({ apps });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch app stats: ${error}` },
      { status: 500 }
    );
  }
}
