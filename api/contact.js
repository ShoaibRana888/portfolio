// POST /api/contact  { name, email, message, website? }  ->  { ok: true }
//
// Emails the message to the site owner over Gmail SMTP, signed in with a Google
// App Password. The visitor's address is set as Reply-To, so hitting "reply" in
// Gmail answers them directly.

const nodemailer = require('nodemailer');
const { guard, parseBody, send } = require('./_utils');

const GMAIL_USER = process.env.GMAIL_USER;
const TO = process.env.CONTACT_TO_EMAIL || GMAIL_USER || 'shoaib.rana888@gmail.com';

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

  // Google shows App Passwords in groups of four; the spaces aren't part of it.
  const appPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!GMAIL_USER || !appPassword) {
    console.error('contact: GMAIL_USER / GMAIL_APP_PASSWORD are not set');
    return send(res, 500, { error: `The form isn't available right now. Please email ${TO} directly.` });
  }

  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: appPassword },
    });
    await transport.sendMail({
      from: `"Portfolio Contact" <${GMAIL_USER}>`,
      to: TO,
      replyTo: email,
      subject: `Portfolio message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error('contact: send failed', err && (err.code || err.message));
    return send(res, 502, { error: `Couldn't send your message. Please email ${TO} directly.` });
  }
};
