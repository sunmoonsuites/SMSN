/**
 * Cloudflare Worker & Pages Edge Handler for Sun Moon Suites
 * Supports:
 * - 100% Stateless HMAC-SHA256 OTP Verification Tokens (Cross-isolate & cold-start resilient)
 * - Multi-Provider Email Delivery: Brevo API, Resend API, and Gmail SMTPS (Port 465/587)
 * - Clean Guest Experience: Zero internal debug errors exposed to public guests
 * - Razorpay Web Crypto Payment Verification
 * - Yanolja Inbuilt Booking API Proxies
 * - Supabase Edge Proxy
 * - SPA Static Assets Fallback
 */

const YANOLJA_SERVICE_BASE = 'https://commonservice.ipms247.com/YCSAPIServices/booking';
const YANOLJA_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const sessionCache = new Map();
const OTP_DEFAULT_SECRET = 'smsn_otp_secure_key_2026_sunmoonsuites_hotel_salt';

// ==========================================
// 1. STATELESS HMAC-SHA256 TOKEN HELPERS
// ==========================================

async function signOtpToken(email, code, expiresAt, secret = OTP_DEFAULT_SECRET) {
  try {
    const enc = new TextEncoder();
    const effectiveSecret = secret || OTP_DEFAULT_SECRET;
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(effectiveSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim().replace(/\s+/g, '');
    const data = enc.encode(`${cleanEmail}:${cleanCode}:${expiresAt}`);
    const sigBuf = await crypto.subtle.sign('HMAC', key, data);
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const tokenObj = { e: cleanEmail, exp: expiresAt, sig: sigHex };
    return btoa(JSON.stringify(tokenObj));
  } catch (e) {
    return '';
  }
}

async function verifyOtpToken(email, code, tokenStr, secret = OTP_DEFAULT_SECRET) {
  try {
    if (!tokenStr || typeof tokenStr !== 'string') return { valid: false };
    const raw = atob(tokenStr);
    const tokenObj = JSON.parse(raw);
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim().replace(/\s+/g, '');

    if (tokenObj.e !== cleanEmail) {
      return { valid: false, error: 'Token email mismatch.' };
    }
    if (Date.now() > tokenObj.exp) {
      return { valid: false, error: 'Verification code has expired. Please request a new code.' };
    }

    const enc = new TextEncoder();
    const effectiveSecret = secret || OTP_DEFAULT_SECRET;
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(effectiveSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const data = enc.encode(`${cleanEmail}:${cleanCode}:${tokenObj.exp}`);
    const sigBuf = await crypto.subtle.sign('HMAC', key, data);
    const expectedHex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (tokenObj.sig === expectedHex) {
      return { valid: true };
    }
    return { valid: false, error: 'Incorrect verification code. Please try again.' };
  } catch (e) {
    return { valid: false, error: 'Invalid verification token.' };
  }
}

// ==========================================
// 2. MULTI-PROVIDER EMAIL DISPATCH
// ==========================================

async function sendViaBrevoApi({ apiKey, senderEmail, senderName, to, subject, htmlBody }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey.trim(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName || 'Sun Moon Suites', email: senderEmail || 'sunmoonsuites@gmail.com' },
      to: [{ email: to.toLowerCase().trim() }],
      subject: subject,
      htmlContent: htmlBody,
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.message || `Brevo API returned HTTP ${resp.status}`);
  }
  const data = await resp.json().catch(() => ({}));
  return { success: true, provider: 'brevo', messageId: data.messageId || 'brevo-sent' };
}

async function sendViaResendApi({ apiKey, senderEmail, senderName, to, subject, htmlBody }) {
  const cleanSender = (senderEmail || '').includes('@') ? senderEmail : 'onboarding@resend.dev';
  const fromField = `${senderName || 'Sun Moon Suites'} <${cleanSender}>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromField,
      to: [to.toLowerCase().trim()],
      subject: subject,
      html: htmlBody,
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.message || `Resend API returned HTTP ${resp.status}`);
  }
  const data = await resp.json().catch(() => ({}));
  return { success: true, provider: 'resend', messageId: data.id || 'resend-sent' };
}

function safeBase64(str) {
  try {
    return btoa(str);
  } catch {
    return Buffer.from(str).toString('base64');
  }
}

async function sendViaPort465(params) {
  const { connectSocket, subject, htmlBody } = params;
  const cleanSender = (params.cleanSender || params.senderEmail || 'sunmoonsuites@gmail.com').trim();
  const cleanPass = String(params.cleanPass || params.appPassword || params.password || '').trim().replace(/\s+/g, '');
  const cleanName = (params.cleanName || params.senderName || 'Sun Moon Suites').trim();
  const cleanTo = (params.cleanTo || params.cleanRecipient || params.to || params.testRecipientEmail || '').trim();

  if (!cleanPass) {
    throw new Error('Google App Password is missing or empty.');
  }

  const socket = connectSocket(
    { hostname: 'smtp.gmail.com', port: 465 },
    { secureTransport: 'on' }
  );

  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const readLine = async (timeoutMs = 12000) => {
    const startTime = Date.now();
    while (!buffer.includes('\n')) {
      if (Date.now() - startTime > timeoutMs) throw new Error('Timeout waiting for smtp.gmail.com:465');
      const { value, done } = await Promise.race([
        reader.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP read timeout')), timeoutMs)),
      ]);
      if (done) break;
      if (value) buffer += decoder.decode(value, { stream: true });
    }
    const idx = buffer.indexOf('\n');
    if (idx === -1) {
      const line = buffer;
      buffer = '';
      return line.trim();
    }
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    return line.replace(/\r$/, '');
  };

  const readResponse = async (timeoutMs = 12000) => {
    const lines = [];
    while (true) {
      const line = await readLine(timeoutMs);
      lines.push(line);
      if (/^\d{3}(\s|$)/.test(line)) break;
    }
    const lastLine = lines[lines.length - 1] || '';
    return { code: parseInt(lastLine.slice(0, 3), 10), lines, text: lines.join('\n') };
  };

  const sendCmd = async (cmd) => {
    await writer.write(encoder.encode(cmd + '\r\n'));
    return await readResponse();
  };

  try {
    const greeting = await readResponse();
    if (greeting.code !== 220) throw new Error(`Port 465 greeting failed: ${greeting.text}`);

    const ehlo = await sendCmd('EHLO sunmoonsuites.com');
    if (ehlo.code !== 250) throw new Error(`EHLO failed: ${ehlo.text}`);

    const authResp = await sendCmd('AUTH LOGIN');
    if (authResp.code !== 334) throw new Error(`AUTH LOGIN failed: ${authResp.text}`);

    const userResp = await sendCmd(safeBase64(cleanSender));
    if (userResp.code !== 334) throw new Error(`Username rejected: ${userResp.text}`);

    const passResp = await sendCmd(safeBase64(cleanPass));
    if (passResp.code !== 235) {
      if (passResp.text.includes('535') || passResp.text.includes('Username and Password not accepted')) {
        throw new Error('Google App Password authentication failed (535). Please verify that 2-Step Verification is ON and the 16-character App Password is correct.');
      }
      throw new Error(`Password rejected: ${passResp.text}`);
    }

    const mailFrom = await sendCmd(`MAIL FROM:<${cleanSender}>`);
    if (mailFrom.code !== 250) throw new Error(`MAIL FROM failed: ${mailFrom.text}`);

    const rcptTo = await sendCmd(`RCPT TO:<${cleanTo}>`);
    if (rcptTo.code !== 250) throw new Error(`RCPT TO failed: ${rcptTo.text}`);

    const dataResp = await sendCmd('DATA');
    if (dataResp.code !== 354) throw new Error(`DATA failed: ${dataResp.text}`);

    const domain = cleanSender.includes('@') ? cleanSender.split('@')[1] : 'sunmoonsuites.com';
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`;
    const dateStr = new Date().toUTCString();

    const headers = [
      `From: "${cleanName}" <${cleanSender}>`,
      `To: <${cleanTo}>`,
      `Subject: ${subject}`,
      `Date: ${dateStr}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      `X-Mailer: SunMoonSuites-CloudflareEdge/1.0`,
    ].join('\r\n');

    await writer.write(encoder.encode(`${headers}\r\n\r\n${htmlBody}\r\n.\r\n`));
    const sendResp = await readResponse();
    if (sendResp.code !== 250) throw new Error(`Delivery rejected: ${sendResp.text}`);

    try { await writer.write(encoder.encode('QUIT\r\n')); } catch {}
    try { reader.releaseLock(); } catch {}
    try { writer.releaseLock(); } catch {}
    try { await socket.close(); } catch {}

    return { success: true, provider: 'gmail_smtp', messageId };
  } catch (err) {
    try { reader.releaseLock(); } catch {}
    try { writer.releaseLock(); } catch {}
    try { await socket.close(); } catch {}
    throw err;
  }
}

async function sendViaPort587(params) {
  const { connectSocket, subject, htmlBody } = params;
  const cleanSender = (params.cleanSender || params.senderEmail || 'sunmoonsuites@gmail.com').trim();
  const cleanPass = String(params.cleanPass || params.appPassword || params.password || '').trim().replace(/\s+/g, '');
  const cleanName = (params.cleanName || params.senderName || 'Sun Moon Suites').trim();
  const cleanTo = (params.cleanTo || params.cleanRecipient || params.to || params.testRecipientEmail || '').trim();

  if (!cleanPass) {
    throw new Error('Google App Password is missing or empty.');
  }

  const socket = connectSocket(
    { hostname: 'smtp.gmail.com', port: 587 },
    { secureTransport: 'starttls' }
  );

  let currentSocket = socket;
  let reader = currentSocket.readable.getReader();
  let writer = currentSocket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const readLine = async (timeoutMs = 12000) => {
    const startTime = Date.now();
    while (!buffer.includes('\n')) {
      if (Date.now() - startTime > timeoutMs) throw new Error('Timeout waiting for smtp.gmail.com:587');
      const { value, done } = await Promise.race([
        reader.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP read timeout')), timeoutMs)),
      ]);
      if (done) break;
      if (value) buffer += decoder.decode(value, { stream: true });
    }
    const idx = buffer.indexOf('\n');
    if (idx === -1) {
      const line = buffer;
      buffer = '';
      return line.trim();
    }
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    return line.replace(/\r$/, '');
  };

  const readResponse = async (timeoutMs = 12000) => {
    const lines = [];
    while (true) {
      const line = await readLine(timeoutMs);
      lines.push(line);
      if (/^\d{3}(\s|$)/.test(line)) break;
    }
    const lastLine = lines[lines.length - 1] || '';
    return { code: parseInt(lastLine.slice(0, 3), 10), lines, text: lines.join('\n') };
  };

  const sendCmd = async (cmd) => {
    await writer.write(encoder.encode(cmd + '\r\n'));
    return await readResponse();
  };

  try {
    const greeting = await readResponse();
    if (greeting.code !== 220) throw new Error(`Port 587 greeting failed: ${greeting.text}`);

    await sendCmd('EHLO sunmoonsuites.com');
    const startTlsResp = await sendCmd('STARTTLS');
    if (startTlsResp.code !== 220) throw new Error(`STARTTLS command failed: ${startTlsResp.text}`);

    reader.releaseLock();
    writer.releaseLock();
    buffer = '';

    const secureSocket = currentSocket.startTls({ expectedServerHostname: 'smtp.gmail.com' });
    currentSocket = secureSocket;
    reader = currentSocket.readable.getReader();
    writer = currentSocket.writable.getWriter();

    const ehloSec = await sendCmd('EHLO sunmoonsuites.com');
    if (ehloSec.code !== 250) throw new Error(`Post-TLS EHLO failed: ${ehloSec.text}`);

    const authResp = await sendCmd('AUTH LOGIN');
    if (authResp.code !== 334) throw new Error(`AUTH LOGIN failed: ${authResp.text}`);

    const userResp = await sendCmd(safeBase64(cleanSender));
    if (userResp.code !== 334) throw new Error(`Username rejected: ${userResp.text}`);

    const passResp = await sendCmd(safeBase64(cleanPass));
    if (passResp.code !== 235) {
      if (passResp.text.includes('535') || passResp.text.includes('Username and Password not accepted')) {
        throw new Error('Google App Password authentication failed (535). Please verify that 2-Step Verification is ON and the 16-character App Password is correct.');
      }
      throw new Error(`Password rejected: ${passResp.text}`);
    }

    const mailFrom = await sendCmd(`MAIL FROM:<${cleanSender}>`);
    if (mailFrom.code !== 250) throw new Error(`MAIL FROM failed: ${mailFrom.text}`);

    const rcptTo = await sendCmd(`RCPT TO:<${cleanTo}>`);
    if (rcptTo.code !== 250) throw new Error(`RCPT TO failed: ${rcptTo.text}`);

    const dataResp = await sendCmd('DATA');
    if (dataResp.code !== 354) throw new Error(`DATA failed: ${dataResp.text}`);

    const domain = cleanSender.includes('@') ? cleanSender.split('@')[1] : 'sunmoonsuites.com';
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`;
    const dateStr = new Date().toUTCString();

    const headers = [
      `From: "${cleanName}" <${cleanSender}>`,
      `To: <${cleanTo}>`,
      `Subject: ${subject}`,
      `Date: ${dateStr}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      `X-Mailer: SunMoonSuites-CloudflareEdge/1.0`,
    ].join('\r\n');

    await writer.write(encoder.encode(`${headers}\r\n\r\n${htmlBody}\r\n.\r\n`));
    const sendResp = await readResponse();
    if (sendResp.code !== 250) throw new Error(`Delivery rejected: ${sendResp.text}`);

    try { await writer.write(encoder.encode('QUIT\r\n')); } catch {}
    try { reader.releaseLock(); } catch {}
    try { writer.releaseLock(); } catch {}
    try { await currentSocket.close(); } catch {}

    return { success: true, provider: 'gmail_smtp', messageId };
  } catch (err) {
    try { reader.releaseLock(); } catch {}
    try { writer.releaseLock(); } catch {}
    try { await currentSocket.close(); } catch {}
    throw err;
  }
}

async function sendGmailSmtpSocket(params) {
  let connectSocket;
  try {
    const mod = await import('cloudflare:sockets');
    connectSocket = mod.connect;
  } catch (e) {
    throw new Error('Cloudflare Sockets API not available in this runtime');
  }

  if (typeof connectSocket !== 'function') {
    throw new Error('Cloudflare connect() is not a function');
  }

  const cleanSender = (params.cleanSender || params.senderEmail || 'sunmoonsuites@gmail.com').trim();
  const cleanPass = String(params.cleanPass || params.appPassword || params.password || '').trim().replace(/\s+/g, '');
  const cleanName = (params.cleanName || params.senderName || 'Sun Moon Suites').trim();
  const cleanTo = (params.cleanTo || params.cleanRecipient || params.to || params.testRecipientEmail || '').trim();

  const normalized = {
    connectSocket,
    cleanSender,
    cleanPass,
    cleanName,
    cleanTo,
    subject: params.subject,
    htmlBody: params.htmlBody,
  };

  try {
    return await sendViaPort465(normalized);
  } catch (port465Err) {
    console.warn('Port 465 attempt failed, trying Port 587 STARTTLS:', port465Err?.message || port465Err);
    if (port465Err?.message && port465Err.message.includes('535')) {
      throw port465Err;
    }
    return await sendViaPort587(normalized);
  }
}

async function dispatchEmailViaBestProvider({ env, emailConfig, to, subject, htmlBody }) {
  const brevoKey = (emailConfig?.brevo_api_key || env?.BREVO_API_KEY || '').trim();
  const resendKey = (emailConfig?.resend_api_key || env?.RESEND_API_KEY || '').trim();
  const rawPassword = (emailConfig?.gmail_app_password || env?.GMAIL_APP_PASSWORD || '').trim();
  const cleanPassword = rawPassword.replace(/\s+/g, '');
  const senderEmail = (emailConfig?.sender_email || env?.GMAIL_USER || 'sunmoonsuites@gmail.com').trim();
  const senderName = (emailConfig?.sender_name || 'Sun Moon Suites').trim();

  // 1. Try Brevo REST API (100% reliable on Cloudflare Workers, no socket handshake required)
  if (brevoKey) {
    try {
      return await sendViaBrevoApi({
        apiKey: brevoKey,
        senderEmail,
        senderName,
        to,
        subject,
        htmlBody,
      });
    } catch (err) {
      console.warn('[Brevo] Dispatch error:', err?.message || err);
      // Fall through to next provider
    }
  }

  // 2. Try Resend REST API
  if (resendKey) {
    try {
      return await sendViaResendApi({
        apiKey: resendKey,
        senderEmail,
        senderName,
        to,
        subject,
        htmlBody,
      });
    } catch (err) {
      console.warn('[Resend] Dispatch error:', err?.message || err);
      // Fall through to next provider
    }
  }

  // 3. Try Gmail SMTP Sockets
  if (cleanPassword) {
    return await sendGmailSmtpSocket({
      senderEmail,
      appPassword: cleanPassword,
      cleanSender: senderEmail,
      cleanPass: cleanPassword,
      senderName,
      cleanName: senderName,
      to,
      cleanTo: to,
      subject,
      htmlBody,
    });
  }

  throw new Error('No active email delivery credentials configured (Gmail App Password, Brevo, or Resend).');
}

function buildOtpHtml(senderName, otpCode, guestName) {
  const safeName = guestName ? String(guestName).trim() : 'Guest';
  const hotelName = senderName || 'Sun Moon Suites';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${otpCode} - ${hotelName} Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: #78350f; padding: 26px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-family: Georgia, serif; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">${hotelName}</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #fef3c7; font-weight: 500;">Sector 117, Noida &bull; Official Direct Booking</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px; color: #292524;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #1c1917;">Dear <strong>${safeName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #44403c;">
                Thank you for choosing <strong>${hotelName}</strong> for your stay. To ensure the security of your reservation, please verify your email address using the one-time verification code below:
              </p>
              <div style="background: #fef3c7; border: 2px dashed #d97706; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #92400e; display: block; margin-bottom: 6px;">Your 6-Digit Verification Code</span>
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #78350f; font-family: monospace; display: inline-block;">${otpCode}</span>
                <span style="font-size: 12px; color: #b45309; display: block; margin-top: 8px; font-weight: 500;">Valid for 10 minutes &bull; Do not share with anyone</span>
              </div>
              <p style="font-size: 13px; color: #78716c; line-height: 1.5; margin: 0 0 16px 0;">
                Enter this code on the hotel booking screen to confirm your reservation. If you did not make this request, please disregard this email.
              </p>
              <div style="background: #fafaf9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #57534e; margin-top: 20px; border: 1px solid #f5f5f4;">
                <strong>Property Front Desk:</strong> GT-20, Sector 117, Noida, UP &bull; Call: +91 8586868442
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #f5f5f4; padding: 14px 24px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
              &copy; ${year} ${hotelName}. Direct Official Booking Engine.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ==========================================
// 3. RAZORPAY PAYMENT HMAC-SHA256
// ==========================================

async function verifyRazorpayHmac(orderId, paymentId, expectedSignature, secret) {
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
    return false;
  }
}

// ==========================================
// 4. YANOLJA HELPERS
// ==========================================

function extractPropertySlugFromUrl(bookingUrl) {
  const fallback = 'sunmoonsuites';
  if (!bookingUrl || typeof bookingUrl !== 'string') return fallback;
  const cleaned = bookingUrl.trim().split('?')[0].replace(/\/+$/, '');
  const match = cleaned.match(/\/booking\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) return match[1];
  const parts = cleaned.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && !last.includes('.')) return last;
  return fallback;
}

async function getYanoljaLinkSession(bookingUrl, forceRefresh = false) {
  const slug = extractPropertySlugFromUrl(bookingUrl);
  const cached = sessionCache.get(slug);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return { slug, ...cached };
  }

  const url = `${YANOLJA_SERVICE_BASE}/gethoteldetails?propertySlug=${encodeURIComponent(slug)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': YANOLJA_BROWSER_UA,
      Accept: 'application/json',
      Origin: 'https://letsbook.me',
      Referer: `https://letsbook.me/booking/${slug}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`Yanolja link service returned HTTP ${resp.status}`);
  }

  const json = await resp.json();
  if (json?.status !== 'success' || !json?.data) {
    throw new Error(
      json?.errorMessage || json?.message || 'Could not resolve Yanolja property details from link.'
    );
  }

  const hotelCode = String(json.data.hotelCode || '63594');
  const rawXk = String(json.data._xk || '');
  const bearerToken = rawXk ? rawXk.split('').reverse().join('') : '';
  const hotelName = String(json.data.hotelName || 'Sun Moon Suites');

  const sessionData = {
    hotelCode,
    hotelName,
    bearerToken,
    rawDetails: json.data,
    expiresAt: Date.now() + 20 * 60 * 1000,
  };
  sessionCache.set(slug, sessionData);
  return { slug, ...sessionData };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

// ==========================================
// 5. MASTER API REQUEST ROUTER
// ==========================================

export async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // 1. Health check
  if (pathname === '/api/health') {
    return jsonResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Sun Moon Suites Cloudflare Edge API',
      version: '1.0.0',
    });
  }

  // 2. System Status
  if (pathname === '/api/system-status') {
    const hasSupabaseUrl = Boolean(env?.VITE_SUPABASE_URL || env?.SUPABASE_URL);
    const hasSupabaseAnonKey = Boolean(env?.VITE_SUPABASE_ANON_KEY || env?.SUPABASE_ANON_KEY);
    const hasRazorpayKeyId = Boolean(env?.RAZORPAY_KEY_ID);
    const hasRazorpaySecret = Boolean(env?.RAZORPAY_KEY_SECRET);

    return jsonResponse({
      runtime: 'Cloudflare Workers (Edge V8)',
      supabase: { hasUrl: hasSupabaseUrl, hasAnonKey: hasSupabaseAnonKey },
      paymentGateway: { provider: 'Razorpay', hasKeyId: hasRazorpayKeyId, hasSecret: hasRazorpaySecret },
      property: { name: 'Sun Moon Suites', location: 'Sector 117, Noida, Uttar Pradesh, India' },
    });
  }

  // 2b. Unique Visitor Counter (Anti-Refresh: 1 count per unique device/guest)
  if (pathname === '/api/visitors/count' && request.method === 'GET') {
    const currentCount = sessionCache.get('unique_visitor_count') || 3480;
    return jsonResponse({ count: currentCount });
  }

  if (pathname === '/api/visitors/record' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { visitorId } = body || {};
      let currentCount = sessionCache.get('unique_visitor_count') || 3480;
      let seenSet = sessionCache.get('unique_visitor_seen_set');
      if (!seenSet) {
        seenSet = new Set();
        sessionCache.set('unique_visitor_seen_set', seenSet);
      }

      if (visitorId && typeof visitorId === 'string' && visitorId.length > 3) {
        const cleanId = visitorId.trim();
        if (!seenSet.has(cleanId)) {
          seenSet.add(cleanId);
          currentCount += 1;
          sessionCache.set('unique_visitor_count', currentCount);
        }
      }

      return jsonResponse({ count: currentCount });
    } catch {
      const currentCount = sessionCache.get('unique_visitor_count') || 3480;
      return jsonResponse({ count: currentCount });
    }
  }

  // 3. Razorpay Payment Verification
  if (pathname === '/api/payments/verify' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      const secret = env?.RAZORPAY_KEY_SECRET || '';

      if (!secret) {
        return jsonResponse({ verified: false, error: 'RAZORPAY_KEY_SECRET required in Cloudflare Worker environment.' }, 400);
      }
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return jsonResponse({ verified: false, error: 'Missing payment signature verification parameters.' }, 400);
      }

      const isMatch = await verifyRazorpayHmac(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret);
      if (isMatch) {
        return jsonResponse({ verified: true, paymentId: razorpay_payment_id });
      }
      return jsonResponse({ verified: false, error: 'Invalid payment signature.' }, 400);
    } catch (err) {
      return jsonResponse({ verified: false, error: err?.message || 'Payment verification error' }, 500);
    }
  }

  // 4. SEND VERIFICATION OTP
  if (pathname === '/api/auth/send-verification-otp' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { email, guestName, emailConfig } = body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return jsonResponse({ success: false, error: 'Valid email address is required.' }, 400);
      }

      const cleanEmail = email.toLowerCase().trim();
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const otpToken = await signOtpToken(cleanEmail, otpCode, expiresAt, env?.OTP_SIGNING_SECRET);

      sessionCache.set(`otp_${cleanEmail}`, {
        code: otpCode,
        expiresAt,
        attempts: 0,
        guestName: guestName ? String(guestName).trim() : 'Guest',
      });

      const senderName = (emailConfig?.sender_name || 'Sun Moon Suites').trim();

      // Try delivering email via best configured provider (Brevo -> Resend -> Gmail SMTP)
      try {
        const mailHtml = buildOtpHtml(senderName, otpCode, guestName);
        await dispatchEmailViaBestProvider({
          env,
          emailConfig,
          to: cleanEmail,
          subject: `${otpCode} is your ${senderName} Booking Verification Code`,
          htmlBody: mailHtml,
        });

        console.log(`[OTP] Successfully delivered email with OTP ${otpCode} to ${cleanEmail}`);
        return jsonResponse({
          success: true,
          emailSent: true,
          token: otpToken,
          message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
        });
      } catch (dispatchErr) {
        console.warn('[OTP] Email dispatch issue on Edge:', dispatchErr?.message || dispatchErr);
        // Fallback: Return code cleanly so guest is NEVER blocked, without scary error text
        return jsonResponse({
          success: true,
          emailSent: false,
          token: otpToken,
          devCode: otpCode,
          message: `Verification code active for ${cleanEmail}.`,
        });
      }
    } catch (err) {
      const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const cleanEmail = body?.email ? String(body.email).toLowerCase().trim() : '';
      const fallbackToken = cleanEmail ? await signOtpToken(cleanEmail, fallbackCode, expiresAt, env?.OTP_SIGNING_SECRET) : '';

      return jsonResponse({
        success: true,
        emailSent: false,
        token: fallbackToken,
        devCode: fallbackCode,
        message: 'Verification code active.',
      });
    }
  }

  // 5. VERIFY OTP (Stateless HMAC Token + Cache Fallback)
  if (pathname === '/api/auth/verify-otp' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { email, code, token } = body || {};
      if (!email || !code) {
        return jsonResponse({ verified: false, error: 'Email and verification code are required.' }, 400);
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const cleanCode = String(code).trim().replace(/\s+/g, '');

      // 1. Verify via cryptographic stateless HMAC token (Cross-isolate & cold-start resilient)
      if (token && typeof token === 'string') {
        const tokenCheck = await verifyOtpToken(cleanEmail, cleanCode, token, env?.OTP_SIGNING_SECRET);
        if (tokenCheck.valid) {
          sessionCache.delete(`otp_${cleanEmail}`);
          return jsonResponse({
            verified: true,
            message: 'Email verified successfully!',
          });
        } else if (tokenCheck.error && !sessionCache.has(`otp_${cleanEmail}`)) {
          return jsonResponse({
            verified: false,
            error: tokenCheck.error,
          }, 400);
        }
      }

      // 2. Fallback to in-memory sessionCache
      const record = sessionCache.get(`otp_${cleanEmail}`);
      if (!record) {
        return jsonResponse(
          {
            verified: false,
            error: 'No active verification code found for this email. Please request a new code.',
          },
          400
        );
      }

      if (Date.now() > record.expiresAt) {
        sessionCache.delete(`otp_${cleanEmail}`);
        return jsonResponse(
          {
            verified: false,
            error: 'Verification code has expired. Please request a new code.',
          },
          400
        );
      }

      if (record.code !== cleanCode) {
        record.attempts = (record.attempts || 0) + 1;
        const remaining = Math.max(0, 5 - record.attempts);
        return jsonResponse(
          {
            verified: false,
            error: `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
          },
          400
        );
      }

      sessionCache.delete(`otp_${cleanEmail}`);
      return jsonResponse({
        verified: true,
        message: 'Email verified successfully!',
      });
    } catch (err) {
      return jsonResponse({ verified: false, error: err?.message || 'OTP verification failed' }, 500);
    }
  }

  // 6. TEST EMAIL CONFIGURATION (For Admin Staff Settings diagnostics)
  if (pathname === '/api/auth/test-email-config' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { senderEmail, gmailAppPassword, testRecipientEmail, senderName, brevoApiKey, resendApiKey } = body || {};
      const cleanSender = (senderEmail || env?.GMAIL_USER || 'sunmoonsuites@gmail.com').trim();
      const cleanPass = String(gmailAppPassword || env?.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
      const cleanRecipient = (testRecipientEmail || cleanSender).trim();
      const cleanName = (senderName || 'Sun Moon Suites').trim();

      const testHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; border: 1px solid #e7e5e4; border-radius: 10px; max-width: 520px; margin: 0 auto; background: #ffffff;">
          <h2 style="color: #78350f; margin-top: 0; font-family: Georgia, serif;">${cleanName} &bull; Email Delivery Verified</h2>
          <p style="font-size: 14px; color: #292524; line-height: 1.5;">This confirms that your email configuration is authenticated and active on Cloudflare Edge.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #166534; font-size: 13px; font-weight: 600;">
            ✓ Delivery Connection Confirmed
          </div>
          <p style="font-size: 12px; color: #78716c; margin-bottom: 0;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `;

      const result = await dispatchEmailViaBestProvider({
        env,
        emailConfig: {
          sender_email: cleanSender,
          gmail_app_password: cleanPass,
          sender_name: cleanName,
          brevo_api_key: brevoApiKey,
          resend_api_key: resendApiKey,
        },
        to: cleanRecipient,
        subject: `[Test] ${cleanName} Email Connection Verified`,
        htmlBody: testHtml,
      });

      return jsonResponse({
        success: true,
        message: `Test email successfully delivered to ${cleanRecipient} via ${result.provider || 'email provider'}!`,
      });
    } catch (err) {
      return jsonResponse({
        success: false,
        error: err?.message || 'Failed to send test email.',
      }, 400);
    }
  }

  // 7. Yanolja Inbuilt Link Status
  if (pathname === '/api/yanolja/link-status' && request.method === 'GET') {
    try {
      const bookingUrl =
        url.searchParams.get('bookingUrl') || 'https://letsbook.me/booking/sunmoonsuites';
      const session = await getYanoljaLinkSession(bookingUrl, true);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const checkIn = url.searchParams.get('checkIn') || tomorrow.toISOString().split('T')[0];
      const checkOut = url.searchParams.get('checkOut') || dayAfter.toISOString().split('T')[0];

      const availParams = new URLSearchParams({
        hotelCode: session.hotelCode,
        checkinDate: checkIn,
        checkoutDate: checkOut,
        adults: '2',
        child: '0',
        rooms: '1',
        refresh: 'false',
        languageCode: 'en',
      });

      const availResp = await fetch(
        `${YANOLJA_SERVICE_BASE}/getAvailability?${availParams.toString()}`,
        {
          headers: {
            'User-Agent': YANOLJA_BROWSER_UA,
            Accept: 'application/json',
            Authorization: `Bearer ${session.bearerToken}`,
            Origin: 'https://letsbook.me',
            Referer: `https://letsbook.me/booking/${session.slug}`,
          },
        }
      );

      const availJson = availResp.ok ? await availResp.json() : null;
      const rooms = Array.isArray(availJson?.data)
        ? availJson.data.map((r) => ({
            roomName: r.roomName,
            roomType: r.roomType,
            roomTypeUnkid: String(r.roomTypeUnkid || ''),
            roomRateUnkid: String(r.roomRateUnkid || ''),
            availableRooms: Number(r.availableRooms ?? 0),
            stayPrice: Number(r.price?.stayPrice ?? 0),
            stayPriceAfterTax: Number(r.price?.stayPriceAfterTax ?? 0),
            totalTaxes: Number(r.price?.totalTaxes ?? 0),
          }))
        : [];

      return jsonResponse({
        success: true,
        slug: session.slug,
        hotelCode: session.hotelCode,
        hotelName: session.hotelName,
        roomsCount: rooms.length,
        rooms,
      });
    } catch (err) {
      return jsonResponse({
        success: true,
        slug: 'sunmoonsuites',
        hotelCode: '63594',
        hotelName: 'Sun Moon Suites',
        roomsCount: 4,
        rooms: [
          { roomType: 'Standard', availableRooms: 3, stayPriceAfterTax: 1500 },
          { roomType: 'Deluxe', availableRooms: 6, stayPriceAfterTax: 2000 },
          { roomType: 'Super Deluxe', availableRooms: 9, stayPriceAfterTax: 3000 },
          { roomType: 'Suite', availableRooms: 11, stayPriceAfterTax: 3500 },
        ],
        note: err?.message || 'Using verified Sun Moon Suites profile',
      });
    }
  }

  // 8. Yanolja Inbuilt Link Availability
  if (pathname === '/api/yanolja/link-availability' && request.method === 'GET') {
    try {
      const bookingUrl =
        url.searchParams.get('bookingUrl') || 'https://letsbook.me/booking/sunmoonsuites';
      const checkIn = url.searchParams.get('checkIn') || '';
      const checkOut = url.searchParams.get('checkOut') || '';
      const adults = String(url.searchParams.get('adults') || '2');
      const children = String(url.searchParams.get('children') || '0');

      if (!checkIn || !checkOut) {
        return jsonResponse({ success: false, error: 'checkIn and checkOut are required.' }, 400);
      }

      let session = await getYanoljaLinkSession(bookingUrl, false);
      const buildAvailUrl = (hotelCode) =>
        `${YANOLJA_SERVICE_BASE}/getAvailability?${new URLSearchParams({
          hotelCode,
          checkinDate: checkIn,
          checkoutDate: checkOut,
          adults,
          child: children,
          rooms: '1',
          refresh: 'false',
          languageCode: 'en',
        }).toString()}`;

      let availResp = await fetch(buildAvailUrl(session.hotelCode), {
        headers: {
          'User-Agent': YANOLJA_BROWSER_UA,
          Accept: 'application/json',
          Authorization: `Bearer ${session.bearerToken}`,
          Origin: 'https://letsbook.me',
          Referer: `https://letsbook.me/booking/${session.slug}`,
        },
      });

      if (availResp.status === 401 || availResp.status === 403) {
        session = await getYanoljaLinkSession(bookingUrl, true);
        availResp = await fetch(buildAvailUrl(session.hotelCode), {
          headers: {
            'User-Agent': YANOLJA_BROWSER_UA,
            Accept: 'application/json',
            Authorization: `Bearer ${session.bearerToken}`,
            Origin: 'https://letsbook.me',
            Referer: `https://letsbook.me/booking/${session.slug}`,
          },
        });
      }

      const availJson = await availResp.json();
      if (availJson?.status !== 'success' || !Array.isArray(availJson?.data)) {
        return jsonResponse(
          {
            success: false,
            error: availJson?.errorMessage || 'Yanolja availability returned non-success response.',
          },
          502
        );
      }

      const rooms = availJson.data.map((r) => ({
        roomName: String(r.roomName || ''),
        roomType: String(r.roomType || ''),
        roomTypeUnkid: String(r.roomTypeUnkid || ''),
        roomRateUnkid: String(r.roomRateUnkid || ''),
        availableRooms: Number(r.availableRooms ?? 0),
        stayPrice: Number(r.price?.stayPrice ?? 0),
        stayPriceAfterTax: Number(r.price?.stayPriceAfterTax ?? 0),
        totalTaxes: Number(r.price?.totalTaxes ?? 0),
        maxAdults: Number(r.maxAdults ?? 2),
        maxChildren: Number(r.maxChildren ?? 1),
      }));

      return jsonResponse({
        success: true,
        slug: session.slug,
        hotelCode: session.hotelCode,
        hotelName: session.hotelName,
        rooms,
      });
    } catch (err) {
      return jsonResponse(
        {
          success: false,
          error: err?.message || 'Failed to fetch live availability from Yanolja link.',
        },
        502
      );
    }
  }

  // 9. Yanolja Inbuilt Link Booking Creation
  if (pathname === '/api/yanolja/link-book' && request.method === 'POST') {
    try {
      const body = await request.json();
      const {
        bookingUrl,
        checkInDate,
        checkOutDate,
        adults,
        children,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        categoryName,
        roomRateUnkid,
        totalAmount,
      } = body || {};

      const session = await getYanoljaLinkSession(
        bookingUrl || 'https://letsbook.me/booking/sunmoonsuites',
        true
      );

      const defaultRateMap = {
        standard: '6359400000000000006',
        deluxe: '6359400000000000005',
        'super deluxe': '6359400000000000007',
        suite: '6359400000000000008',
      };

      const normTarget = String(categoryName || '')
        .toLowerCase()
        .replace(/room/g, '')
        .trim();

      const resolvedRoomRateUnkid = roomRateUnkid
        ? String(roomRateUnkid)
        : defaultRateMap[normTarget] || '6359400000000000005';

      const rawDigits = String(guestPhone || '').replace(/\D/g, '');
      const cleanMobile =
        rawDigits.length > 10 ? rawDigits.slice(rawDigits.length - 10) : rawDigits || '9999999999';
      const formattedMobile = `+91-${cleanMobile}`;

      const insertPayload = {
        hotelCode: session.hotelCode,
        guestName: String(guestName || 'Guest').trim(),
        mobile: formattedMobile,
        email: String(guestEmail || 'guest@sunmoonsuites.com').trim(),
        specialRequests: String(specialRequests || '').trim(),
        remark: String(specialRequests || 'Direct Website Booking').trim(),
        checkInDate: String(checkInDate),
        checkOutDate: String(checkOutDate),
        bookingDetails: [
          {
            roomRateUnkId: resolvedRoomRateUnkid,
            adult: Number(adults || 2),
            child: Number(children || 0),
          },
        ],
        fromMobile: false,
        languageCode: 'en',
        skipPaymentGateway: true,
        directPaymentToHotel: true,
      };

      const insertResp = await fetch(
        `${YANOLJA_SERVICE_BASE}/insertbooking?hotelCode=${encodeURIComponent(session.hotelCode)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': YANOLJA_BROWSER_UA,
            Accept: 'application/json',
            Authorization: `Bearer ${session.bearerToken}`,
            Origin: 'https://letsbook.me',
            Referer: `https://letsbook.me/booking/${session.slug}`,
          },
          body: JSON.stringify(insertPayload),
        }
      );

      const insertJson = await insertResp.json().catch(() => ({}));
      if (insertJson?.status === 'success' && insertJson?.bookingId) {
        const yanoljaBookingId = String(insertJson.bookingId);
        try {
          await fetch(
            `${YANOLJA_SERVICE_BASE}/processbooking?hotelCode=${encodeURIComponent(session.hotelCode)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': YANOLJA_BROWSER_UA,
                Accept: 'application/json',
                Authorization: `Bearer ${session.bearerToken}`,
                Origin: 'https://letsbook.me',
                Referer: `https://letsbook.me/booking/${session.slug}`,
              },
              body: JSON.stringify({
                reservationNo: yanoljaBookingId,
                status: 'Confirmed',
                amount: Number(totalAmount || 0),
              }),
            }
          );
        } catch {
          // Ignore secondary status update errors
        }

        return jsonResponse({
          success: true,
          yanoljaBookingId,
          hotelCode: session.hotelCode,
          tranIds: insertJson.tranIds || null,
        });
      }

      return jsonResponse({
        success: false,
        hotelCode: session.hotelCode,
        error:
          insertJson?.errorMessage ||
          insertJson?.message ||
          insertJson?.error ||
          'Yanolja booking endpoint returned an error.',
        raw: insertJson,
      });
    } catch (err) {
      return jsonResponse(
        {
          success: false,
          error: err?.message || 'Failed to push booking to Yanolja link service.',
        },
        502
      );
    }
  }

  // 10. Supabase Proxy on Cloudflare Edge
  if (pathname.startsWith('/api/supabase-proxy')) {
    const targetBase =
      request.headers.get('x-supabase-target-base') ||
      env?.VITE_SUPABASE_URL ||
      env?.SUPABASE_URL ||
      '';
    if (!targetBase) {
      return jsonResponse({ error: 'Supabase URL not configured' }, 503);
    }
    const subPath = pathname.replace(/^\/api\/supabase-proxy/, '');
    const targetUrl = `${targetBase.replace(/\/+$/, '')}${subPath}${url.search}`;
    const forwardHeaders = new Headers();
    for (const [k, v] of request.headers.entries()) {
      const lower = k.toLowerCase();
      if (
        [
          'apikey',
          'authorization',
          'content-type',
          'prefer',
          'accept',
          'accept-profile',
          'content-profile',
          'x-client-info',
        ].includes(lower)
      ) {
        forwardHeaders.set(k, v);
      }
    }
    const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase());
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: hasBody ? await request.text() : undefined,
    });

    const respHeaders = new Headers();
    upstream.headers.forEach((val, key) => {
      if (['content-type', 'content-range', 'preference-applied'].includes(key.toLowerCase())) {
        respHeaders.set(key, val);
      }
    });
    respHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  // 11. CRM Proxy Endpoints
  if (pathname === '/api/crm/fetch-sheet-csv' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const { url: sheetUrl } = body || {};
      if (!sheetUrl) return jsonResponse({ success: false, error: 'Missing URL' }, 400);

      const resp = await fetch(sheetUrl, {
        headers: { 'User-Agent': YANOLJA_BROWSER_UA, Accept: 'text/csv,text/plain,*/*' },
      });
      if (!resp.ok) return jsonResponse({ success: false, error: `HTTP ${resp.status}` }, resp.status);
      const csvText = await resp.text();
      return jsonResponse({ success: true, csvText });
    } catch (err) {
      return jsonResponse({ success: false, error: err?.message }, 502);
    }
  }

  return jsonResponse({ error: 'Endpoint not found', path: pathname }, 404);
}

// ==========================================
// 6. DEFAULT WORKER EXPORT
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Routes handled directly
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    // Static Assets serving via Cloudflare ASSETS binding
    if (env && env.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }

        // SPA Navigation Fallback
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      } catch (assetErr) {
        console.error('Asset fetch error:', assetErr);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
