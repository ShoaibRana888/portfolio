// POST /api/contact  { name, email, message, website? }  ->  { ok: true }
//
// Emails the message to the site owner through Resend. The visitor's address is
// set as Reply-To, so hitting "reply" in Gmail answers them directly.

const { guard, parseBody, send } = require('./_utils');

const TO = process.env.CONTACT_TO_EMAIL || 'shoaib.rana888@gmail.com';
// Resend's shared sender works without a verified domain, but only delivers to
// the email address the Resend account was created with.
const FROM = process.env.CONTACT_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

// Strip control characters so a field can't inject headers or extra lines.
const oneLine = (s) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();

module.exports = async function handler(req, res) {
  if (!guard(req, res, { bucket: 'contact', limit: 5, windowMs: 10 * 60_000 })) return;

  const body = parseBody(req);
  if (!body) return send(res, 400, { error: 'Invalid request.' });

  // Honeypot: real visitors never see or fill this field. Pretend success.
  if (typeof body.website === 'string' && body.website.trim()) return send(res, 200, { ok: true });

  const name = typeof body.name === 'string' ? oneLine(body.name) : '';
  const email = typeof body.email === 'string' ? oneLine(body.email) : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || name.length > 100) return send(res, 400, { error: 'Please enter your name.' });
  if (!EMAIL_RE.test(email) || email.length > 200) return send(res, 400, { error: 'Please enter a valid email address.' });
  if (message.length < 10) return send(res, 400, { error: 'Please write a slightly longer message.' });
  if (message.length > 3000) return send(res, 400, { error: 'Your message is too long (3000 characters max).' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('contact: RESEND_API_KEY is not set');
    return send(res, 500, { error: `The form isn't available right now. Please email ${TO} directly.` });
  }

  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: `Portfolio message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!upstream.ok) {
      console.error('contact: Resend error', upstream.status, (await upstream.text()).slice(0, 300));
      return send(res, 502, { error: `Couldn't send your message. Please email ${TO} directly.` });
    }
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error('contact: request failed', err && err.name);
    return send(res, 502, { error: `Couldn't send your message. Please email ${TO} directly.` });
  }
};
