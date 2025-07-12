import { NextRequest, NextResponse } from 'next/server'
import { WebSocketMessage } from '@/types'

// Configure the Edge Runtime for WebSocket support
export const runtime = 'edge'

// Note: Full WebSocket support in Next.js Edge Runtime is limited
// This is a basic implementation that would need to be enhanced
// for production use with a WebSocket server like Socket.io or ws

export async function GET(request: NextRequest) {
  // In a production environment, this would establish a WebSocket connection
  // For now, we'll return a Server-Sent Events (SSE) connection as an alternative
  
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  
  if (!sessionId) {
    return new NextResponse('Session ID required', { status: 400 })
  }

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: Date.now(),
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(initialMessage))

      // Set up periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now(),
          })}\n\n`
          
          controller.enqueue(new TextEncoder().encode(heartbeat))
        } catch (error) {
          console.error('Heartbeat error:', error)
          clearInterval(heartbeatInterval)
          controller.close()
        }
      }, 30000) // 30 second heartbeat

      // Store cleanup function
      ;(controller as any).cleanup = () => {
        clearInterval(heartbeatInterval)
      }
    },
    
    cancel() {
      // Cleanup when client disconnects
      if ((this as any).cleanup) {
        (this as any).cleanup()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// POST endpoint for sending messages (fallback for when WebSocket isn't available)
export async function POST(request: NextRequest) {
  try {
    const message: WebSocketMessage = await request.json()
    
    // Process the message (in a real implementation, this would broadcast to connected clients)
    await processWebSocketMessage(message)
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    })
    
  } catch (error) {
    console.error('WebSocket message processing error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Message processing failed',
        timestamp: Date.now(),
      },
      { status: 500 }
    )
  }
}

/**
 * Process incoming WebSocket messages
 */
async function processWebSocketMessage(message: WebSocketMessage): Promise<void> {
  switch (message.type) {
    case 'behavior_event':
      // In a real implementation, this would trigger real-time analysis
      console.log('Received behavior event via WebSocket:', message.payload)
      break
      
    case 'ping':
      // Handle ping (pong would be sent back in real WebSocket implementation)
      console.log('Received ping from session:', message.sessionId)
      break
      
    default:
      console.warn('Unknown WebSocket message type:', message.type)
  }
}