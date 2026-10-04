/**
 * Cloudflare Workers & Cloudflare Pages Edge Handler
 * 100% compatible with Cloudflare Edge V8 Runtime, Web Crypto API, and static assets.
 */

// In-memory OTP storage for Cloudflare Workers instance
const otpCache = new Map();

/**
 * Verifies Razorpay HMAC-SHA256 payment signature using native Web Crypto API
 */
async function verifyHmacSha256(orderId, paymentId, expectedSignature, secret) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const message = encoder.encode(`${orderId}|${paymentId}`);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, message);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const generatedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return generatedHex.toLowerCase() === expectedSignature.toLowerCase();
  } catch (e) {
    console.error('Web Crypto HMAC calculation error:', e);
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const jsonHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    };

    // 1. Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          runtime: 'Cloudflare Workers (Edge V8)',
          service: 'Sun Moon Suites Booking Engine API',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }),
        { headers: jsonHeaders }
      );
    }

    // 2. System Status check
    if (url.pathname === '/api/system-status') {
      const hasSupabaseUrl = Boolean(env.VITE_SUPABASE_URL || env.SUPABASE_URL);
      const hasSupabaseAnonKey = Boolean(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY);
      const hasRazorpayKeyId = Boolean(env.RAZORPAY_KEY_ID);
      const hasRazorpaySecret = Boolean(env.RAZORPAY_KEY_SECRET);

      return new Response(
        JSON.stringify({
          runtime: 'Cloudflare Workers',
          supabase: {
            hasUrl: hasSupabaseUrl,
            hasAnonKey: hasSupabaseAnonKey,
          },
          paymentGateway: {
            provider: 'Razorpay',
            hasKeyId: hasRazorpayKeyId,
            hasSecret: hasRazorpaySecret,
          },
          property: {
            name: 'Sun Moon Suites',
            location: 'Sector 117, Noida, Uttar Pradesh, India',
          },
        }),
        { headers: jsonHeaders }
      );
    }

    // 3. Razorpay Payment Verification using Web Crypto API
    if (url.pathname === '/api/payments/verify' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
        const secret = env.RAZORPAY_KEY_SECRET || '';

        if (!secret) {
          return new Response(
            JSON.stringify({
              verified: false,
              error: 'RAZORPAY_KEY_SECRET required in Cloudflare Worker environment.',
            }),
            { status: 400, headers: jsonHeaders }
          );
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return new Response(
            JSON.stringify({
              verified: false,
              error: 'Missing payment signature verification parameters.',
            }),
            { status: 400, headers: jsonHeaders }
          );
        }

        const isMatch = await verifyHmacSha256(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          secret
        );

        if (isMatch) {
          return new Response(
            JSON.stringify({ verified: true, paymentId: razorpay_payment_id }),
            { headers: jsonHeaders }
          );
        } else {
          return new Response(
            JSON.stringify({ verified: false, error: 'Invalid payment signature.' }),
            { status: 400, headers: jsonHeaders }
          );
        }
      } catch (err) {
        return new Response(
          JSON.stringify({ verified: false, error: err.message || 'Verification error' }),
          { status: 500, headers: jsonHeaders }
        );
      }
    }

    // 4. Send Verification OTP
    if (url.pathname === '/api/auth/send-verification-otp' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const email = (body.email || '').toLowerCase().trim();
        const guestName = (body.guestName || '').trim();

        if (!email || !email.includes('@')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Valid email address is required.' }),
            { status: 400, headers: jsonHeaders }
          );
        }

        // Generate 6-digit random code using Web Crypto API
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const code = (100000 + (array[0] % 900000)).toString();

        otpCache.set(email, {
          code,
          expiresAt: Date.now() + 15 * 60 * 1000,
          guestName,
          attempts: 0,
        });

        return new Response(
          JSON.stringify({
            success: true,
            emailSent: false,
            devCode: code,
            message: `Verification code generated for ${email}.`,
            warning: 'Instant Verification active. Enter code or click Auto-Fill.',
          }),
          { headers: jsonHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message || 'Failed to send OTP' }),
          { status: 500, headers: jsonHeaders }
        );
      }
    }

    // 5. Verify OTP
    if (url.pathname === '/api/auth/verify-otp' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const email = (body.email || '').toLowerCase().trim();
        const code = (body.code || '').trim();

        if (!email || !code) {
          return new Response(
            JSON.stringify({ verified: false, error: 'Email and verification code are required.' }),
            { status: 400, headers: jsonHeaders }
          );
        }

        const cached = otpCache.get(email);
        if (!cached) {
          return new Response(
            JSON.stringify({
              verified: false,
              error: 'Verification code expired or not found. Please request a new code.',
            }),
            { status: 400, headers: jsonHeaders }
          );
        }

        if (Date.now() > cached.expiresAt) {
          otpCache.delete(email);
          return new Response(
            JSON.stringify({ verified: false, error: 'Verification code has expired. Please request a new code.' }),
            { status: 400, headers: jsonHeaders }
          );
        }

        if (cached.code !== code) {
          cached.attempts = (cached.attempts || 0) + 1;
          return new Response(
            JSON.stringify({ verified: false, error: 'Incorrect verification code. Please try again.' }),
            { status: 400, headers: jsonHeaders }
          );
        }

        // Success: Clean up
        otpCache.delete(email);
        return new Response(
          JSON.stringify({
            verified: true,
            message: 'Email address verified successfully!',
          }),
          { headers: jsonHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ verified: false, error: err.message || 'OTP verification error' }),
          { status: 500, headers: jsonHeaders }
        );
      }
    }

    // If an unknown /api route was requested, return 404 JSON
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Endpoint not found', path: url.pathname }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Static Asset Serving via Cloudflare ASSETS binding
    if (env && env.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }

        // SPA Fallback: Serve index.html for navigation routes
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      } catch (assetErr) {
        console.error('Asset fetch error:', assetErr);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
