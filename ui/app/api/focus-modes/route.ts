import { NextResponse } from 'next/server';
import {
  CreateFocusModeInput,
  UpdateFocusModeInput,
} from '@/lib/types/focus-mode';
import { prisma } from '@/lib/prisma';

// GET /api/focus-modes
export async function GET() {
  try {
    const modes = await prisma.focusMode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(modes);
  } catch (error) {
    console.error('Failed to fetch focus modes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch focus modes' },
      { status: 500 },
    );
  }
}

// POST /api/focus-modes
export async function POST(request: Request) {
  try {
    const data: CreateFocusModeInput = await request.json();
    const mode = await prisma.focusMode.create({
      data: {
        name: data.name,
        description: data.description,
        apiEndpoint: data.apiEndpoint,
        config: data.config,
      },
    });
    return NextResponse.json(mode);
  } catch (error) {
    console.error('Failed to create focus mode:', error);
    return NextResponse.json(
      { error: 'Failed to create focus mode' },
      { status: 500 },
    );
  }
}
