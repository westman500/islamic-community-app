/**
 * Paystack Payment Integration Service
 * Handles deposits, donations, and withdrawals via Paystack API
 */

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || (window as any).__PAYSTACK_PUBLIC_KEY
const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY || (window as any).__PAYSTACK_SECRET_KEY

export interface PaystackConfig {
  email: string
  amount: number // Amount in Naira (will be converted to kobo)
  reference: string
  metadata: {
    user_id: string
    transaction_type: 'deposit' | 'donation'
    recipient_id?: string
    custom_fields?: Array<{ display_name: string; variable_name: string; value: string }>
  }
  callback_url?: string
  channels?: string[] // ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
}

export interface TransferRecipient {
  name: string
  account_number: string
  bank_code: string
  currency?: string
}

export interface WithdrawalRequest {
  amount: number
  recipient_code: string
  reason?: string
  reference: string
}

/**
 * Initialize Paystack payment popup
 * Opens Paystack inline payment form
 */
export const initializePaystackPayment = (config: PaystackConfig) => {
  return new Promise((resolve, reject) => {
    if (!PAYSTACK_PUBLIC_KEY && !(window as any).PaystackPop) {
      reject(new Error('Paystack public key not configured. Set VITE_PAYSTACK_PUBLIC_KEY or window.__PAYSTACK_PUBLIC_KEY'))
      return
    }

    // Load Paystack inline script if not already loaded
    if (!(window as any).PaystackPop) {
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.onload = () => initPayment()
      script.onerror = () => reject(new Error('Failed to load Paystack script'))
      document.body.appendChild(script)
    } else {
      initPayment()
    }

    function initPayment() {
      const handler = (window as any).PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: config.email,
        amount: Math.round(config.amount * 100), // Convert to kobo
        ref: config.reference,
        metadata: config.metadata,
        callback_url: config.callback_url,
        channels: config.channels || ['card', 'bank', 'ussd', 'bank_transfer'],
        onClose: () => {
          reject(new Error('Payment cancelled by user'))
        },
        callback: (response: any) => {
          console.log('Paystack payment successful:', response)
          resolve(response)
        },
      })

      handler.openIframe()
    }
  })
}

/**
 * Verify payment transaction
 * Confirms payment was successful on Paystack servers
 */
export const verifyPaystackPayment = async (reference: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Paystack verification failed:', data)
      return false
    }

    return data.status && data.data.status === 'success'
  } catch (error) {
    console.error('Error verifying payment:', error)
    return false
  }
}

/**
 * Create a transfer recipient for withdrawals
 * Must be called before initiating a transfer
 */
export const createTransferRecipient = async (recipient: TransferRecipient): Promise<string> => {
  try {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: recipient.name,
        account_number: recipient.account_number,
        bank_code: recipient.bank_code,
        currency: recipient.currency || 'NGN',
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to create recipient')
    }

    return data.data.recipient_code
  } catch (error) {
    console.error('Error creating recipient:', error)
    throw error
  }
}

/**
 * Initiate a transfer (withdrawal) to a recipient
 * Requires prior balance on Paystack account
 */
export const initiateTransfer = async (withdrawal: WithdrawalRequest): Promise<any> => {
  try {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(withdrawal.amount * 100), // Convert to kobo
        recipient: withdrawal.recipient_code,
        reason: withdrawal.reason || 'Withdrawal from Masjid App',
        reference: withdrawal.reference,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to initiate transfer')
    }

    return data.data
  } catch (error) {
    console.error('Error initiating transfer:', error)
    throw error
  }
}

/**
 * Get list of Nigerian banks for account verification
 * Used in withdrawal form to select user's bank
 */
export const getNigerianBanks = async (): Promise<Array<{ name: string; code: string }>> => {
  try {
    const response = await fetch('https://api.paystack.co/bank?currency=NGN', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error('Failed to fetch banks')
    }

    return data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
    }))
  } catch (error) {
    console.error('Error fetching banks:', error)
    return []
  }
}

/**
 * Verify bank account number
 * Resolves account name for the given account number and bank
 */
export const verifyBankAccount = async (
  accountNumber: string,
  bankCode: string
): Promise<{ account_name: string; account_number: string } | null> => {
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok || !data.status) {
      console.error('Account verification failed:', data)
      return null
    }

    return {
      account_name: data.data.account_name,
      account_number: data.data.account_number,
    }
  } catch (error) {
    console.error('Error verifying account:', error)
    return null
  }
}

/**
 * Generate unique payment reference
 */
export const generatePaymentReference = (prefix: string = 'PMT'): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000)
  return `${prefix}_${timestamp}_${random}`
}
