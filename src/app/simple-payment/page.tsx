'use client'

import type React from 'react'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'

// Backend API endpoints
const BACKEND_URL = 'http://localhost:8001'
const CLIENT_TOKEN_ENDPOINT = `${BACKEND_URL}/api/venmo/client-token`
const PROCESS_PAYMENT_ENDPOINT = `${BACKEND_URL}/api/venmo/process-payment`

export default function SimplePaymentPage() {
  const router = useRouter()
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [amount, setAmount] = useState('10.00')
  const [paymentMethod, setPaymentMethod] = useState('venmo')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch client token from the backend
  useEffect(() => {
    const getClientToken = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        console.log('Fetching client token from:', CLIENT_TOKEN_ENDPOINT)

        const response = await fetch(CLIENT_TOKEN_ENDPOINT, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }).catch((error) => {
          console.error('Fetch error:', error.message)
          throw new Error(`Network error: ${error.message}`)
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('Backend response error:', response.status, errorText)
          throw new Error(`Backend returned ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        if (data.clientToken) {
          setClientToken(data.clientToken)
          setIsDevelopmentMode(false)
        } else {
          throw new Error('No client token received from server')
        }
      } catch (error) {
        console.error('Error fetching client token:', error)
        setErrorMessage(
          `Failed to connect to payment service: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )

        // For development/testing purposes, we can provide a fallback
        setIsDevelopmentMode(true)
      } finally {
        setIsLoading(false)
      }
    }

    getClientToken()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    setIsProcessing(true)
    setErrorMessage('')

    try {
      // In a real implementation, you would get the payment method nonce from Braintree
      // For this simple version, we'll just simulate a successful payment

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Redirect to success page
      router.push('/payment-success')
    } catch (error) {
      console.error('Payment error:', error)
      setErrorMessage(
        `An unexpected error occurred: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Simple Payment Form
        </h1>

        <Card>
          {isDevelopmentMode && (
            <div className="px-6 pt-6">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Development Mode</AlertTitle>
                <AlertDescription>
                  Running in development mode. No real payments will be
                  processed.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Choose your payment method and enter the amount.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="venmo"
                      id="venmo"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="venmo"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-6 w-6 mb-2"
                        fill="#3D95CE"
                      >
                        <path d="M19.5 1.5h-15A3 3 0 0 0 1.5 4.5v15a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-15a3 3 0 0 0-3-3zm-4.5 15c-1.35 0-6.375-5.1-6.375-8.25 0-1.575.9-2.625 2.4-2.625 1.35 0 2.4 1.125 3.075 2.25h.075l.825-2.25h2.25c-.75 3.075-3.075 10.875-3.075 10.875h-.9z" />
                      </svg>
                      Venmo
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="paypal"
                      id="paypal"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="paypal"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-6 w-6 mb-2"
                        fill="#00457C"
                      >
                        <path d="M20.067 8.478c.492.315.844.843.844 1.554 0 1.64-1.326 2.563-3.06 2.563h-.386c-.258 0-.48.18-.527.425l-.41 2.648c-.05.253-.266.445-.523.445h-1.652a.476.476 0 0 1-.477-.558l.016-.103.033-.215.218-1.406a.48.48 0 0 1 .475-.413h.518c2.067 0 3.532-1.037 4.005-3.218a3.35 3.35 0 0 0 .059-.722m-9.187 7.11l-.004.026a.474.474 0 0 1-.477.558H8.746a.48.48 0 0 1-.477-.402l-.958-6.18-.002-.006a.48.48 0 0 1 .477-.558h1.657c.258 0 .477.184.527.427l.958 6.135m8.95-14.375C21.07 1.89 20.068.712 18.3.712H11.39c-.59 0-1.094.423-1.18 1l-2.486 15.79c-.1.485.297.912.795.912h2.63c.59 0 1.094-.423 1.18-1l.61-3.865c.09-.575.59-.998 1.18-.998h.626c2.056 0 3.674-.83 4.252-3.263.274-1.147.142-2.103-.342-2.76-.507-.69-1.408-1.086-2.613-1.25l.019-.075z" />
                      </svg>
                      PayPal
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="border rounded-md p-4 space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                    <strong>Simple Payment Form:</strong> This is a simplified
                    version that doesn't require the Braintree script.
                  </div>

                  <div className="p-3 border rounded bg-muted">
                    <h3 className="font-medium mb-2">
                      Mock {paymentMethod === 'venmo' ? 'Venmo' : 'PayPal'}{' '}
                      Interface
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {paymentMethod === 'venmo'
                          ? 'Venmo Account'
                          : 'PayPal Account'}
                        :
                        <span className="font-medium ml-1">
                          test@example.com
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          alert('This is a simplified interface for testing.')
                        }
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${amount}`
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
