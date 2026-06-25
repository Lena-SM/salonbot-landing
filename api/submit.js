export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, telegram, salon, lang, _honey } = req.body || {};

  // Honeypot — boty fill this, humans don't
  if (_honey) return res.status(200).json({ ok: true });

  if (!name || !email || !salon) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const results = {};

  // === Telegram ===
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    const t = {
      pl: { title: 'Nowe zgłoszenie z salonbot.pl', name: 'Imię', email: 'Email', tg: 'Telegram', salon: 'Salon' },
      ru: { title: 'Новая заявка с salonbot.pl', name: 'Имя', email: 'Email', tg: 'Telegram', salon: 'Салон' },
      uk: { title: 'Нова заявка з salonbot.pl', name: "Ім'я", email: 'Email', tg: 'Telegram', salon: 'Салон' },
      en: { title: 'New enquiry from salonbot.pl', name: 'Name', email: 'Email', tg: 'Telegram', salon: 'Salon' },
    };
    const l = t[lang] || t['pl'];
    const text = [
      `🆕 <b>${l.title}</b>`,
      '',
      `👤 ${l.name}: ${name}`,
      `📧 ${l.email}: ${email}`,
      `📱 ${l.tg}: ${telegram || '—'}`,
      `💇 ${l.salon}: ${salon}`,
    ].join('\n');
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      results.telegram = r.ok;
    } catch (e) {
      console.error('Telegram error:', e);
      results.telegram = false;
    }
  } else {
    results.telegram = null;
  }

  // === Formspree (email) ===
  const formspreeId = process.env.FORMSPREE_ID;
  if (formspreeId) {
    try {
      const r = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, telegram, salon }),
      });
      results.email = r.ok;
    } catch (e) {
      console.error('Formspree error:', e);
      results.email = false;
    }
  } else {
    results.email = null;
  }

  return res.status(200).json({ ok: true, ...results });
}
