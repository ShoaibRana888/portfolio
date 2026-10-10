// POST /api/chat  { messages: [{ role: 'user' | 'assistant', content: string }] }
// -> { reply: string }
//
// Proxies to OpenAI so the API key never reaches the browser.

const { guard, parseBody, send } = require('./_utils');
const { SYSTEM_PROMPT, REMINDER } = require('./_knowledge');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TURNS = 12; // messages of history sent to the model
const MAX_USER_CHARS = 500;
const MAX_ASSISTANT_CHARS = 2000;
const MAX_REPLY_TOKENS = 350;
const TIMEOUT_MS = 25000;

function cleanHistory(raw) {
  if (!Array.isArray(raw)) return null;
  const messages = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || typeof m.content !== 'string') continue;
    // Only user/assistant roles are accepted, so clients can't inject "system".
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const limit = m.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    const content = m.content.trim().slice(0, limit);
    if (content) messages.push({ role: m.role, content });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  return messages;
}

module.exports = async function handler(req, res) {
  if (!guard(req, res, { bucket: 'chat', limit: 20, windowMs: 60_000 })) return;

  const body = parseBody(req);
  const messages = body && cleanHistory(body.messages);
  if (!messages) return send(res, 400, { error: 'Please send a message.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('chat: OPENAI_API_KEY is not set');
    return send(res, 500, { error: 'The assistant is not available right now.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: MAX_REPLY_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
          { role: 'system', content: REMINDER },
        ],
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      console.error('chat: OpenAI error', upstream.status, (await upstream.text()).slice(0, 300));
      return send(res, 502, { error: 'The assistant is having trouble. Please try again shortly.' });
    }

    const data = await upstream.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return send(res, 502, { error: 'The assistant is having trouble. Please try again shortly.' });
    return send(res, 200, { reply: reply.trim() });
  } catch (err) {
    console.error('chat: request failed', err && err.name);
    return send(res, 502, { error: 'The assistant is having trouble. Please try again shortly.' });
  } finally {
    clearTimeout(timer);
  }
};
