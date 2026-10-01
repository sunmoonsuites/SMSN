import { EmailVerificationConfig } from '../types';

export interface SendOtpResponse {
  success: boolean;
  emailSent?: boolean;
  message?: string;
  devCode?: string;
  warning?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  message?: string;
  error?: string;
}

export interface TestEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Sends a 6-digit verification code to the guest's email via Gmail SMTP
 */
export async function sendVerificationOtp(
  email: string,
  guestName?: string,
  emailConfig?: EmailVerificationConfig
): Promise<SendOtpResponse> {
  try {
    const res = await fetch('/api/auth/send-verification-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        guestName: guestName?.trim(),
        emailConfig,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to connect to email verification service.',
    };
  }
}

/**
 * Validates the 6-digit OTP entered by the guest
 */
export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        code: code.trim(),
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      verified: false,
      error: err?.message || 'Failed to verify code. Please try again.',
    };
  }
}

/**
 * Tests the Gmail SMTP configuration from Admin Settings
 */
export async function testGmailConfiguration(params: {
  senderEmail?: string;
  gmailAppPassword: string;
  testRecipientEmail: string;
  senderName?: string;
}): Promise<TestEmailResponse> {
  try {
    const res = await fetch('/api/auth/test-email-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to test Gmail connection.',
    };
  }
}
