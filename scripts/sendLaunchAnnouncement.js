/**
 * sendLaunchAnnouncement.js
 * Sends ETHOnline mainnet launch announcement to waitlist
 * 
 * Run manually on September 4 AFTER mainnet deploy:
 * node scripts/sendLaunchAnnouncement.js
 * 
 * DO NOT run before mainnet is confirmed live.
 */

require('dotenv').config();

const EMAILS = [
  'alagbasamuel3@gmail.com',
  'relax.dude777@gmail.com',
  'boegebonx@gmail.com',
  'burakdamli@outlook.com',
  'duenasdiego133@gmail.com',
  'malphite848@gmail.com',
  'neobovyazkovo10@gmail.com',
  'juegosmex21@icloud.com',
  'rdyktrade.1@gmail.com',
  'carlin.bryan25@gmail.com',
  'luisolvs@icloud.com',
];

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background:#000000;" bgcolor="#000000">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background:#000000;padding:32px 16px;">
<tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#06090F" style="background:#06090F;max-width:540px;width:100%;border-radius:16px;border:1px solid #1a1f2e;padding:32px;">

  <tr><td style="padding-bottom:24px;border-bottom:1px solid #1a1f2e;">
    <span style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Aevum</span>
    <span style="font-size:14px;color:rgba(255,255,255,0.3);"> Protocol</span>
    <span style="display:inline-block;margin-left:10px;padding:3px 10px;border-radius:20px;background:#0a1a12;border:1px solid #00FFD1;font-size:10px;color:#00FFD1;font-weight:600;letter-spacing:0.06em;vertical-align:middle;">MAINNET LIVE</span>
  </td></tr>

  <tr><td style="padding:28px 0 12px;">
    <div style="font-size:11px;color:#555f6e;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">September 4, 2026 &middot; ETHOnline 2026</div>
    <h1 style="margin:0;font-size:30px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;line-height:1.25;">We are live on<br>Ethereum mainnet.</h1>
  </td></tr>

  <tr><td style="padding:0 0 28px;">
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.85;">You signed up for early access to Aevum Protocol. Today we deployed to Ethereum mainnet as part of ETHOnline 2026. The Verifiable Backtest Oracle is live &mdash; and you are among the first to know.</p>
  </td></tr>

  <tr><td style="padding:0 0 10px;">
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0d14" style="background:#0a0d14;border:1px solid #1a1f2e;border-radius:12px;">
      <tr><td style="padding:20px;">
        <div style="font-size:10px;color:#555f6e;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:10px;">The problem we solve</div>
        <div style="font-size:13px;color:#6b7280;line-height:1.85;padding-bottom:16px;">Every trading strategy can claim a great backtest. There is no way to know if it was cherry-picked after the fact. Until now.</div>
        <div style="padding-top:16px;border-top:1px solid #1a1f2e;font-size:13px;color:#9ca3af;line-height:1.85;"><strong style="color:#ffffff;">VBO certificates</strong> prove your strategy was defined <em>before</em> the forward window opened. Post-hoc modification is cryptographically impossible. The blockchain is the proof.</div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:10px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="49%" bgcolor="#0a0d14" style="background:#0a0d14;padding:18px;border:1px solid #1a1f2e;border-radius:10px;vertical-align:top;">
          <div style="font-size:10px;color:#555f6e;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Layer 1</div>
          <div style="font-size:13px;font-weight:600;color:#e5e7eb;margin-bottom:6px;">Aevum</div>
          <div style="font-size:11px;color:#6b7280;line-height:1.7;">Strategy hash sealed on-chain before window opens.</div>
        </td>
        <td width="2%"></td>
        <td width="49%" bgcolor="#030d1a" style="background:#030d1a;padding:18px;border:1px solid #00A8FF;border-radius:10px;vertical-align:top;">
          <div style="font-size:10px;color:#00A8FF;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Layer 2</div>
          <div style="font-size:13px;font-weight:600;color:#00A8FF;margin-bottom:6px;">Atlas Oracle</div>
          <div style="font-size:11px;color:#6b7280;line-height:1.7;">BTC/USD prices signed by 905+ exchanges. Verified on-chain.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:10px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0d14" style="background:#0a0d14;border:1px solid #1a1f2e;border-radius:12px;">
      <tr><td style="padding:20px;">
        <div style="font-size:10px;color:#555f6e;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px;">Certificate pricing</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><div style="font-size:13px;font-weight:600;color:#e5e7eb;">Basic</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">7-30 day window &middot; Atlas Oracle</div></td>
              <td align="right"><span style="font-size:20px;font-weight:700;color:#ffffff;">$500</span></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><div style="font-size:13px;font-weight:600;color:#e5e7eb;">Professional</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">Priority attestation &middot; methodology report</div></td>
              <td align="right"><span style="font-size:20px;font-weight:700;color:#ffffff;">$1,500</span></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><div style="font-size:13px;font-weight:600;color:#e5e7eb;">Institutional</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">Same-day &middot; white-label &middot; dedicated support</div></td>
              <td align="right"><span style="font-size:20px;font-weight:700;color:#ffffff;">$5,000</span></td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:10px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#030d1a" style="background:#030d1a;border:1px solid #0a2a4a;border-radius:10px;">
      <tr><td style="padding:14px 18px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px;vertical-align:middle;"><div style="width:6px;height:6px;border-radius:50%;background:#00A8FF;"></div></td>
          <td style="font-size:12px;color:#6b7280;line-height:1.6;">Price data <strong style="color:#00A8FF;">powered by Atlas Oracle</strong> &mdash; CoinMarketCap-backed &middot; 905+ exchange sources &middot; cryptographically signed on-chain</td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:28px 0 20px;text-align:center;">
    <a href="https://aevum-frontend.vercel.app/vbo" style="display:inline-block;padding:14px 40px;background:#00A8FF;color:#06090F;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:-0.01em;">Commit your strategy &#8599;</a>
    <div style="margin-top:10px;"><a href="https://aevumprotocol.io" style="font-size:12px;color:#374151;text-decoration:none;">aevumprotocol.io</a></div>
  </td></tr>

  <tr><td style="padding:20px 0 0;border-top:1px solid #1a1f2e;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-size:11px;color:#374151;">Aevum Protocol Inc. &middot; Delaware C-Corp</div>
        <div style="font-size:10px;color:#1f2937;margin-top:3px;">ETHOnline 2026 Finalist &middot; Powered by Atlas Oracle</div>
      </td>
      <td align="right"><a href="mailto:support@aevumprotocol.io" style="font-size:11px;color:#374151;text-decoration:none;">support@aevumprotocol.io</a></td>
    </tr></table>
    <div style="margin-top:10px;font-size:10px;color:#1f2937;">You received this because you signed up for early access at aevumprotocol.io</div>
  </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;

async function sendEmail(to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Aevum Protocol <jonathan@aevumprotocol.io>',
      to,
      subject: 'Aevum Protocol is live on Ethereum mainnet',
      html,
    }),
  });
  return res.json();
}

async function main() {
  console.log('Aevum Protocol — Launch Announcement');
  console.log('WARNING: This will send to', EMAILS.length, 'real email addresses.');
  console.log('Type SEND to confirm or Ctrl+C to cancel:');
  await new Promise((resolve, reject) => {
    process.stdin.once('data', (data) => {
      if (data.toString().trim() === 'SEND') resolve();
      else { console.log('Cancelled.'); process.exit(0); }
    });
  });
  console.log('Sending to', EMAILS.length, 'waitlist members...');
  console.log('');

  for (const email of EMAILS) {
    try {
      const result = await sendEmail(email);
      console.log('✓', email, '—', result.id);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('✗', email, '—', err.message);
    }
  }

  console.log('');
  console.log('✓ Launch announcement sent to all waitlist members.');
}

main().catch(console.error);
