import { Hono } from 'hono';
import { authMiddleware, getUserSupabase } from '../middleware/auth.js';
import { RateLimitError } from '../errors.js';
import { getConfig } from '../config.js';

export const emailRoutes = new Hono<{
  Variables: {
    userId: string;
    role: string;
    token: string;
    logger: any;
  }
}>();

// Simple in-memory rate limiting for the endpoint
const rateLimits = new Map<string, { count: number, resetAt: number }>();

emailRoutes.post('/send', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const reqLogger = c.get('logger');
  
  // Rate limiting (10 per hour per user)
  const now = Date.now();
  const rl = rateLimits.get(userId) || { count: 0, resetAt: now + 3600 * 1000 };
  if (now > rl.resetAt) {
    rl.count = 0;
    rl.resetAt = now + 3600 * 1000;
  }
  if (rl.count >= 10) {
    throw new RateLimitError('Too many emails sent');
  }
  rl.count++;
  rateLimits.set(userId, rl);

  const body = await c.req.json();
  const { to, type, title, body: emailBody } = body;

  const supabase = getUserSupabase(c);

  // Check esg_settings notify_email
  const { data: settings, error: settingsError } = await supabase
    .from('esg_settings')
    .select('notify_email')
    .single();

  if (settingsError) {
    reqLogger.error({ err: settingsError }, 'Failed to read esg_settings');
    return c.json({ sent: false, reason: 'error' }, 500);
  }

  if (!settings?.notify_email) {
    return c.json({ sent: false, reason: 'disabled' }, 200);
  }

  const config = getConfig();
  const resendApiKey = config.RESEND_API_KEY;
  if (!resendApiKey) {
    reqLogger.warn('RESEND_API_KEY is missing but notify_email is enabled');
    return c.json({ sent: false, reason: 'unconfigured' }, 200);
  }

  // Obfuscate email for logging
  const obfEmail = to ? `${to.split('@')[0].slice(0, 2)}***@${to.split('@')[1]}` : 'unknown';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'EcoSphere <notifications@ecosphere.app>',
        to,
        subject: title,
        html: `<div style="font-family: sans-serif; color: #333;">
          <h2>${title}</h2>
          <p>${emailBody}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">You received this because email notifications are enabled in EcoSphere.</p>
        </div>`
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      reqLogger.error({ resendError: errTxt, to: obfEmail }, 'Resend API error');
      return c.json({ sent: false, reason: 'error' }, 500);
    }

    reqLogger.info({ type, to: obfEmail }, 'Email sent successfully');

    // Add to metrics counter
    const metricsRes = await fetch('http://localhost:' + process.env.PORT + '/metrics/increment?key=email_sent', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.INTERNAL_METRICS_TOKEN || 'dev-metrics-token'}` }
    }).catch(() => null);

    return c.json({ sent: true }, 200);

  } catch (err) {
    reqLogger.error({ err, to: obfEmail }, 'Failed to send email');
    return c.json({ sent: false, reason: 'error' }, 500);
  }
});
