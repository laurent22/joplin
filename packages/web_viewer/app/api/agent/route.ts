import { NextRequest, NextResponse } from 'next/server';
import { LangChainClient } from '@/mcp/client/LangChainClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const response = await LangChainClient.sendMcpQuestion(message);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error processing agent request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}





