import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Hotel Management System API',
      version: '1.0.0',
    });
  });

  // 2. System Status check (Checks server-side environment secrets without revealing them)
  app.get('/api/system-status', (req, res) => {
    const hasSupabaseUrl = Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
    const hasSupabaseAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
    const hasSupabaseServiceKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const hasRazorpayKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
    const hasRazorpaySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);

    res.json({
      supabase: {
        hasUrl: hasSupabaseUrl,
        hasAnonKey: hasSupabaseAnonKey,
        hasServiceKey: hasSupabaseServiceKey,
      },
      paymentGateway: {
        provider: 'Razorpay',
        hasKeyId: hasRazorpayKeyId,
        hasSecret: hasRazorpaySecret,
      },
      property: {
        targetRooms: 30,
        location: 'Sector 117, Noida, Uttar Pradesh, India',
      },
    });
  });

  // 3. Secure Server-Side Payment Verification (Razorpay HMAC-SHA256)
  // RULE 18: Never mark a payment as successful only because the frontend says so.
  app.post('/api/payments/verify', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(400).json({
        verified: false,
        error: 'Online payment configuration required on server (RAZORPAY_KEY_SECRET missing).',
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        verified: false,
        error: 'Missing payment signature verification parameters.',
      });
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const isMatch = generatedSignature === razorpay_signature;

      if (isMatch) {
        return res.json({ verified: true, paymentId: razorpay_payment_id });
      } else {
        return res.status(400).json({ verified: false, error: 'Invalid payment signature. Verification failed.' });
      }
    } catch (err: any) {
      return res.status(500).json({ verified: false, error: err.message || 'Signature verification failed' });
    }
  });

  // 4. Get SQL Migration Content
  app.get('/api/migrations/sql', (req, res) => {
    try {
      const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260921000000_initial_schema.sql');
      if (fs.existsSync(sqlPath)) {
        const content = fs.readFileSync(sqlPath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        return res.send(content);
      }
      return res.status(404).send('-- Migration file not found on server.');
    } catch (err: any) {
      return res.status(500).send(`-- Error reading migration file: ${err.message}`);
    }
  });

  // 5. Get Quick RLS Fix SQL Content
  app.get('/api/migrations/rls-fix', (req, res) => {
    try {
      const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260927000000_fix_all_rls_policies.sql');
      if (fs.existsSync(sqlPath)) {
        const content = fs.readFileSync(sqlPath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        return res.send(content);
      }
      return res.status(404).send('-- RLS fix migration file not found on server.');
    } catch (err: any) {
      return res.status(500).send(`-- Error reading RLS fix migration file: ${err.message}`);
    }
  });

  // 5b. AI Vision SEO Photo Category, Name & Caption Optimizer for Hotel Gallery
  app.post('/api/gallery/ai-seo-optimize', async (req, res) => {
    try {
      const { hotelName, address, city, items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No gallery items provided for optimization.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY not configured on server; using built-in Local SEO engine.',
          useLocalFallback: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const cleanHotel = (hotelName || 'Sun Moon Suites').trim();
      const cleanAddress = (address || 'GT-20, Sector 117').trim();
      const cleanCity = (city || 'Noida').trim();

      const ALLOWED_CATEGORIES = new Set([
        'Standard Room',
        'Deluxe Room',
        'Super Deluxe Room',
        'Suite Room',
        'Rooms',
        'Banquet Hall',
        'Hotel & Lobby',
        'Dining',
        'Exterior & Facade',
      ]);

      const SPECIFIC_ROOM_CATS = new Set([
        'Standard Room',
        'Deluxe Room',
        'Super Deluxe Room',
        'Suite Room',
      ]);

      // Helper to fetch image bytes as base64 from image_url or data URI
      const fetchImageInlineData = async (
        imageUrl?: string,
        imageBase64?: string,
        mimeType?: string
      ): Promise<{ mimeType: string; data: string } | null> => {
        if (imageBase64 && typeof imageBase64 === 'string') {
          return {
            mimeType: mimeType || 'image/jpeg',
            data: imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
          };
        }
        if (!imageUrl || typeof imageUrl !== 'string') return null;

        if (imageUrl.startsWith('data:image/')) {
          const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) {
            return { mimeType: match[1], data: match[2] };
          }
          return null;
        }

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          try {
            const resp = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!resp.ok) return null;
            const contentType = resp.headers.get('content-type') || 'image/jpeg';
            const buf = await resp.arrayBuffer();
            return {
              mimeType: contentType.split(';')[0].trim() || 'image/jpeg',
              data: Buffer.from(buf).toString('base64'),
            };
          } catch {
            clearTimeout(timeout);
            return null;
          }
        }
        return null;
      };

      const modelsToTry = [
        'gemini-3.1-flash-lite',
        'gemini-3-flash-preview',
        'gemini-3.8-flash',
        'gemini-flash-latest',
      ];

      const analyzeBatchChunk = async (chunk: any[], startIndex: number) => {
        const fetched = await Promise.all(
          chunk.map(async (item, idx) => ({
            item,
            seq: item?.index || startIndex + idx + 1,
            inlineData: await fetchImageInlineData(
              item?.image_url,
              item?.imageBase64,
              item?.mimeType
            ),
          }))
        );

        const parts: any[] = [
          {
            text: `You are a Hospitality Visual Inspector & Local Hotel SEO Expert for "${cleanHotel}", a boutique hotel at "${cleanAddress}, ${cleanCity}" (Sector 117 Noida).
Below are ${fetched.length} hotel photographs. Look carefully at EACH photograph and identify what is ACTUALLY visible inside that specific image.

For each photo, return an object with:
1. "id": The exact Photo ID provided before the image.
2. "category": Classify into EXACTLY ONE of these values based strictly on what is visible in that image:
   - "Exterior & Facade": Hotel building outside, front facade, exterior architecture, entrance ramp/gate from outside, balcony exterior, or parking area.
   - "Hotel & Lobby": Reception desk, front desk, hotel logo backdrop, lobby sofa/waiting lounge, glass entrance door, indoor staircase, elevator/lift, or guest floor corridor/hallway with room doors.
   - "Banquet Hall": Event hall, banquet space, party/wedding hall, stage, or conference room.
   - "Dining": Dining room, restaurant tables, breakfast buffet, kitchen, or food service area.
   - "Standard Room", "Deluxe Room", "Super Deluxe Room", or "Suite Room": Guest bedroom (bed, headboard, curtains, wardrobe, TV, work desk) OR attached guest bathroom/washroom (sink, mirror, shower, toilet, tiles).
3. "photoName": A short, accurate 3 to 6 word title describing the exact visual subject of that photo (e.g., "Hotel Front Facade & Exterior", "24x7 Reception Desk & Lobby", "Lobby Guest Waiting Sofa Lounge", "Reception & Wooden Staircase", "Guest Floor Corridor & Hallway", "Deluxe Room with Tufted Headboard", "Attached Modern Bathroom & Washroom").
4. "seoCaption": Format as "<photoName> — <specific visual details from the photo> at ${cleanHotel} Sector 117 Noida" (total 65 to 105 characters).
   - CRITICAL: Describe ONLY what is visually present in that exact photo.
   - NEVER call a building exterior, reception desk, sofa lounge, staircase, or corridor a "Room" or "Bed".
   - NEVER call a bedroom with a bed a "Bathroom", and NEVER call a bathroom with tiles/shower a "King Bed".`,
          },
        ];

        for (const entry of fetched) {
          const existingCat = (entry.item?.category || 'Rooms').trim();
          const preserveHint = SPECIFIC_ROOM_CATS.has(existingCat)
            ? ` (User assigned room type: "${existingCat}")`
            : '';
          parts.push({
            text: `\n--- PHOTO ID: "${entry.item.id}" (Photo #${entry.seq})${preserveHint} ---`,
          });
          if (entry.inlineData) {
            parts.push({ inlineData: entry.inlineData });
          }
        }

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: { parts },
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      category: { type: Type.STRING },
                      photoName: { type: Type.STRING },
                      seoCaption: { type: Type.STRING },
                    },
                    required: ['id', 'category', 'photoName', 'seoCaption'],
                  },
                },
              },
            });

            const parsed = JSON.parse(response.text || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((p: any) => {
                const detectedCat = ALLOWED_CATEGORIES.has(p.category) ? p.category : 'Rooms';
                const cleanName = (p.photoName || '').trim();
                const rawCaption = (p.seoCaption || '').trim();
                const fullCaption =
                  cleanName && !rawCaption.toLowerCase().startsWith(cleanName.toLowerCase())
                    ? `${cleanName} — ${rawCaption}`
                    : rawCaption;
                return {
                  id: p.id,
                  category: detectedCat,
                  photoName: cleanName,
                  seoCaption: fullCaption,
                };
              });
            }
          } catch {
            // Try next model in fallback chain
          }
        }
        return [];
      };

      const results: Array<{
        id: string;
        category: string;
        photoName?: string;
        seoCaption: string;
      }> = [];
      const CHUNK_SIZE = 4;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const chunkRes = await analyzeBatchChunk(chunk, i);
        results.push(...chunkRes);
      }

      return res.json({ optimized: results });
    } catch (err: any) {
      return res.status(500).json({
        error: err.message || 'AI SEO optimization failed',
        useLocalFallback: true,
      });
    }
  });

  // 6. Real-Time PMS Notification Hub (Server-Authoritative State + SSE Broadcast)
  interface ServerNotification {
    id: string;
    type: 'checkin' | 'enquiry' | 'maintenance';
    title: string;
    message: string;
    targetTab: 'frontdesk' | 'enquiries' | 'housekeeping' | 'reservations';
    read: boolean;
    created_at: string;
    meta?: {
      roomNumber?: string;
      guestName?: string;
      bookingRef?: string;
      priority?: string;
      contact?: string;
    };
  }

  const notificationsStore: ServerNotification[] = [
    {
      id: 'seed-notif-checkin-1',
      type: 'checkin',
      title: 'Guest Checked In • Room 101',
      message: 'Rahul Sharma (Ref: SM-98421) checked into Deluxe Room 101 (2 Adults).',
      targetTab: 'frontdesk',
      read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      meta: { roomNumber: '101', guestName: 'Rahul Sharma', bookingRef: 'SM-98421' },
    },
    {
      id: 'seed-notif-enquiry-1',
      type: 'enquiry',
      title: 'Incoming Website Enquiry',
      message: 'Vikram Malhotra (+91 98112 34091): "Looking for 4 Executive Rooms for corporate stay this Friday."',
      targetTab: 'enquiries',
      read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
      meta: { guestName: 'Vikram Malhotra', contact: '+91 98112 34091' },
    },
    {
      id: 'seed-notif-maint-1',
      type: 'maintenance',
      title: 'Urgent Maintenance Request • Room 204',
      message: 'AC cooling unit pressure drop reported in Room 204 prior to VIP arrival.',
      targetTab: 'housekeeping',
      read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      meta: { roomNumber: '204', priority: 'Urgent' },
    },
  ];

  const sseClients = new Set<express.Response>();

  const broadcastSSE = (event: string, payload: unknown) => {
    const formatted = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.write(formatted);
      } catch {
        sseClients.delete(client);
      }
    });
  };

  app.get('/api/notifications', (req, res) => {
    res.json({ notifications: notificationsStore });
  });

  app.get('/api/notifications/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial state sync on connect
    res.write(`event: notifications:init\ndata: ${JSON.stringify(notificationsStore)}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.post('/api/notifications', (req, res) => {
    const incoming = req.body as Partial<ServerNotification>;
    if (!incoming || !incoming.type || !incoming.title || !incoming.message) {
      return res.status(400).json({ error: 'Missing required notification fields' });
    }

    const id = incoming.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Idempotency guard: skip duplicate IDs
    const existing = notificationsStore.find((n) => n.id === id);
    if (existing) {
      return res.json({ notification: existing, duplicate: true });
    }

    const created: ServerNotification = {
      id,
      type: incoming.type,
      title: incoming.title,
      message: incoming.message,
      targetTab:
        incoming.targetTab ||
        (incoming.type === 'checkin'
          ? 'frontdesk'
          : incoming.type === 'enquiry'
          ? 'enquiries'
          : 'housekeeping'),
      read: false,
      created_at: incoming.created_at || new Date().toISOString(),
      meta: incoming.meta || {},
    };

    notificationsStore.unshift(created);
    if (notificationsStore.length > 100) {
      notificationsStore.length = 100;
    }

    broadcastSSE('notification:created', created);
    return res.status(201).json({ notification: created });
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const item = notificationsStore.find((n) => n.id === id);
    if (item) {
      item.read = true;
      broadcastSSE('notification:updated', item);
    }
    return res.json({ success: true });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    notificationsStore.forEach((n) => {
      n.read = true;
    });
    broadcastSSE('notifications:read-all', {});
    return res.json({ success: true });
  });

  app.delete('/api/notifications', (req, res) => {
    notificationsStore.length = 0;
    broadcastSSE('notifications:cleared', {});
    return res.json({ success: true });
  });

  // 7. Server-Side Supabase Proxy (Ensures 100% reliability on Indian ISPs like Jio/Airtel where *.supabase.co may time out)
  app.use('/api/supabase-proxy', async (req, res) => {
    const targetBase =
      (req.headers['x-supabase-target-base'] as string) ||
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';

    if (!targetBase) {
      return res.status(503).json({ error: 'Supabase URL not configured on server' });
    }

    const cleanBase = targetBase.replace(/\/+$/, '');
    const targetUrl = `${cleanBase}${req.url}`;

    try {
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        const lower = k.toLowerCase();
        if (
          ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info'].includes(lower) &&
          typeof v === 'string'
        ) {
          forwardHeaders[k] = v;
        }
      }

      const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: hasBody && req.body ? JSON.stringify(req.body) : undefined,
      });

      res.status(upstream.status);
      upstream.headers.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (['content-type', 'content-range', 'preference-applied'].includes(lower)) {
          res.setHeader(key, val);
        }
      });

      const text = await upstream.text();
      return res.send(text);
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'Upstream Supabase proxy error' });
    }
  });

  const distPath = path.join(process.cwd(), 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isRunningViaTsx = process.execArgv.some((arg) => arg.includes('tsx'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    (!isRunningViaTsx && hasBuiltDist);

  // Vite middleware for development vs static build for production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hotel PMS Server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
