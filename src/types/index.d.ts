// Type definitions for Braintree components
export interface BraintreeInstance {
  requestPaymentMethod: () => Promise<{ nonce: string }>
  teardown: () => Promise<void>
}
