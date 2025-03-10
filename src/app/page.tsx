'use client'

import type React from 'react'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
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
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react'

// Backend API endpoints
const BACKEND_URL = 'http://localhost:8001'
const CLIENT_TOKEN_ENDPOINT = `${BACKEND_URL}/api/venmo/client-token`
const PROCESS_PAYMENT_ENDPOINT = `${BACKEND_URL}/api/venmo/process-payment`

// Debug mode - set to true to see detailed logs
const DEBUG = true

export default function PaymentPage() {
  const router = useRouter()
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [amount, setAmount] = useState('10.00')
  const [paymentMethod, setPaymentMethod] = useState('venmo')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [instance, setInstance] = useState<any>(null)
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false)
  const [developmentMessage, setDevelopmentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState(false)

  // Use a ref to track if the component is mounted
  const isMounted = useRef(true)

  // Reference to the dropin container
  const dropinContainerRef = useRef<HTMLDivElement>(null)

  // Debug log function
  const debugLog = (...args: any[]) => {
    if (DEBUG) {
      console.log('[DEBUG]', ...args)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
      // Clean up Braintree instance if it exists
      if (instance) {
        debugLog('Cleaning up Braintree instance on unmount')
        instance.teardown().catch((err: any) => {
          console.error('Error tearing down Braintree instance:', err)
        })
      }
    }
  }, [instance])

  // Fetch client token from the backend
  useEffect(() => {
    const getClientToken = async () => {
      try {
        setIsLoading(true)
        setErrorMessage('')

        debugLog('Fetching client token from:', CLIENT_TOKEN_ENDPOINT)

        const response = await fetch(CLIENT_TOKEN_ENDPOINT, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add a timeout to prevent hanging requests
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
        debugLog('Received response:', data)

        if (data.clientToken) {
          debugLog('Client token received, length:', data.clientToken.length)
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

        // For development/testing purposes, we can provide a fallback token
        debugLog('Switching to development mode due to error')
        setIsDevelopmentMode(true)
        setDevelopmentMessage('Using development mode due to connection error')
        setClientToken('mock_client_token_for_development')
      } finally {
        if (isMounted.current) {
          setIsLoading(false)
        }
      }
    }

    getClientToken()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!instance && !isDevelopmentMode) {
      setErrorMessage('Payment system not initialized')
      return
    }

    setIsProcessing(true)
    setPaymentStatus('idle')
    setErrorMessage('')

    try {
      // Get payment method nonce
      let nonce

      if (isDevelopmentMode) {
        // Use a mock nonce in development mode
        nonce = 'mock-payment-method-nonce'
        debugLog('Using mock payment nonce in development mode')
      } else {
        // Request payment method from Braintree
        debugLog('Requesting payment method from Braintree')
        const result = await instance.requestPaymentMethod()
        nonce = result.nonce
        debugLog('Received payment method nonce:', nonce ? '✓' : '✗')
      }

      // Prepare payment data
      const paymentData = {
        paymentMethodNonce: nonce,
        amount,
        userId: '67cbfb264a1df012485244c6', // This would typically come from your auth system
        membershipId: '67ce716b2e7c3e697e2d9d7f', // This would typically be selected by the user
        paymentMethod,
      }

      if (isDevelopmentMode) {
        // Simulate a successful payment in development mode
        debugLog('Development mode: Simulating successful payment', paymentData)

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setPaymentStatus('success')

        // Simulate redirect delay
        setTimeout(() => {
          router.push('/payment-success')
        }, 2000)
      } else {
        // Process real payment with the backend
        debugLog('Processing payment at:', PROCESS_PAYMENT_ENDPOINT)

        const response = await fetch(PROCESS_PAYMENT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
          // Add a timeout to prevent hanging requests
          signal: AbortSignal.timeout(15000),
        }).catch((error) => {
          console.error('Fetch error:', error.message)
          throw new Error(`Network error: ${error.message}`)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || `Server returned ${response.status}`
          )
        }

        const result = await response.json()
        debugLog('Payment result:', result)

        if (result.status === 'success' || result.transaction) {
          setPaymentStatus('success')
          // Redirect or show success message
          setTimeout(() => {
            router.push('/payment-success')
          }, 2000)
        } else {
          throw new Error('Payment was not successful')
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentStatus('error')
      setErrorMessage(
        `An unexpected error occurred: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      if (isMounted.current) {
        setIsProcessing(false)
      }
    }
  }

  // Initialize Braintree when script is loaded and token is available
  useEffect(() => {
    if (!clientToken || !scriptLoaded || isDevelopmentMode) return

    debugLog('Attempting to initialize Braintree with token and script loaded')

    const initializeBraintree = () => {
      if (!window.braintree) {
        console.error('Braintree library not loaded')
        setScriptError(true)
        return
      }

      try {
        if (!dropinContainerRef.current) {
          console.error('Dropin container ref not found')
          return
        }

        // Make sure the container is empty
        if (dropinContainerRef.current.children.length > 0) {
          debugLog('Container is not empty, clearing it')
          dropinContainerRef.current.innerHTML = ''
        }

        debugLog('Dropin container is empty, initializing Braintree')

        const paymentOptions: any = {
          authorization: clientToken,
          container: dropinContainerRef.current,
          card: {
            flow: 'vault',
          },
        }

        // Configure payment options based on selected method
        if (paymentMethod === 'venmo') {
          paymentOptions.venmo = {
            allowNewBrowserTab: false,
          }
        } else if (paymentMethod === 'paypal') {
          paymentOptions.paypal = {
            flow: 'vault',
          }
        }

        // Clean up previous instance if it exists
        if (instance) {
          debugLog('Tearing down previous Braintree instance')
          instance
            .teardown()
            .then(() => {
              if (!isMounted.current) return

              debugLog('Creating new Braintree instance')
              window.braintree.dropin.create(
                paymentOptions,
                (error: any, dropinInstance: any) => {
                  if (!isMounted.current) return

                  if (error) {
                    console.error('Error creating Braintree instance:', error)
                    setScriptError(true)
                    return
                  }

                  debugLog('Braintree instance created successfully')
                  setInstance(dropinInstance)
                }
              )
            })
            .catch((err: any) => {
              console.error('Error tearing down Braintree instance:', err)
            })
        } else {
          debugLog('Creating new Braintree instance (no previous instance)')
          window.braintree.dropin.create(
            paymentOptions,
            (error: any, dropinInstance: any) => {
              if (!isMounted.current) return

              if (error) {
                console.error('Error creating Braintree instance:', error)
                setScriptError(true)
                return
              }

              debugLog('Braintree instance created successfully')
              setInstance(dropinInstance)
            }
          )
        }
      } catch (error) {
        console.error('Error initializing Braintree:', error)
        setScriptError(true)
      }
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        initializeBraintree()
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [clientToken, scriptLoaded, paymentMethod, instance, isDevelopmentMode])

  // Mock payment instance for development mode
  useEffect(() => {
    if (!isDevelopmentMode) return

    debugLog('Setting up mock payment instance for development mode')

    const mockInstance = {
      requestPaymentMethod: async () => {
        debugLog('Mock payment method requested')
        return { nonce: 'mock-payment-method-nonce' }
      },
      teardown: async () => {
        debugLog('Mock instance teardown')
        return Promise.resolve()
      },
    }

    setInstance(mockInstance)

    return () => {
      // Cleanup function
      if (isMounted.current) {
        setInstance(null)
      }
    }
  }, [isDevelopmentMode])

  if (paymentStatus === 'success') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Payment Successful!</CardTitle>
            <CardDescription className="text-center">
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-center w-full text-sm text-muted-foreground">
              Redirecting you to the confirmation page...
            </p>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <Script
        src="https://js.braintreegateway.com/web/dropin/1.33.7/js/dropin.min.js"
        onLoad={() => {
          debugLog('Braintree script loaded successfully')
          setScriptLoaded(true)
        }}
        onError={(e) => {
          console.error('Failed to load Braintree script:', e)
          setScriptError(true)
        }}
        strategy="afterInteractive"
      />

      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Complete Your Payment
        </h1>

        <Card>
          {isDevelopmentMode && (
            <div className="px-6 pt-6">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Development Mode</AlertTitle>
                <AlertDescription>
                  {developmentMessage ||
                    'Running in development mode. No real payments will be processed.'}
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
      
                  </div>
                </RadioGroup>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isDevelopmentMode ? (
                <div className="border rounded-md p-4 space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                    <strong>Development Mode:</strong> Using mock payment
                    interface. No actual payments will be processed.
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
                          alert(
                            'This is a mock interface for development only.'
                          )
                        }
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 border rounded-md p-4 min-h-[200px]">
                  {scriptError ? (
                    <div className="text-center p-4 text-destructive">
                      <p>Failed to load payment interface.</p>
                      <p className="text-sm mt-2">
                        Please refresh the page or try again later.
                      </p>
                      {DEBUG && (
                        <div className="mt-4 p-3 border border-dashed border-destructive/30 text-xs text-left">
                          <p className="font-semibold">Debug Information:</p>
                          <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>
                              Script Loaded: {scriptLoaded ? 'Yes' : 'No'}
                            </li>
                            <li>
                              Client Token:{' '}
                              {clientToken ? 'Available' : 'Missing'}
                            </li>
                            <li>
                              Braintree Object:{' '}
                              {window.braintree ? 'Available' : 'Missing'}
                            </li>
                          </ul>
                          <p className="mt-2">
                            Check browser console for more details.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Show loading indicator outside the container */}
                      {!instance && (
                        <div className="flex justify-center mb-4">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {/* Keep the container completely empty */}
                      <div
                        ref={dropinContainerRef}
                        className="w-full min-h-[150px]"
                      ></div>
                    </>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={isProcessing || (!instance && !isDevelopmentMode)}
              >
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

// Add type definition for the Braintree global object
declare global {
  interface Window {
    braintree: {
      dropin: {
        create: (
          options: any,
          callback: (error: any, instance: any) => void
        ) => void
      }
    }
  }
}
