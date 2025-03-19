import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { UpdateFocusModeInput } from '@/lib/types/focus-mode';

const prisma = new PrismaClient();

// PUT /api/focus-modes/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const data: UpdateFocusModeInput = await request.json();
    const mode = await prisma.focusMode.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        apiEndpoint: data.apiEndpoint,
        config: data.config,
      },
    });
    return NextResponse.json(mode);
  } catch (error) {
    console.error('Failed to update focus mode:', error);
    return NextResponse.json(
      { error: 'Failed to update focus mode' },
      { status: 500 },
    );
  }
}

// DELETE /api/focus-modes/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.focusMode.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete focus mode:', error);
    return NextResponse.json(
      { error: 'Failed to delete focus mode' },
      { status: 500 },
    );
  }
}
