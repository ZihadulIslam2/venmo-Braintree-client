import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Call your backend API to get the client token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/venmo/client-token`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch client token')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching client token:', error)
    return NextResponse.json(
      { error: 'Failed to generate client token' },
      { status: 500 }
    )
  }
}
