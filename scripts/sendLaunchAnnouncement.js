/**
 * sendLaunchAnnouncement.js
 * Sends ETHOnline launch announcement to waitlist
 * Run: node scripts/sendLaunchAnnouncement.js
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

const html = `<html><body style="margin:0;padding:0;background:#06090F;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06090F;padding:40px 0;">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
  <span style="font-size:13px;font-weight:600;color:#fff;">Aevum Protocol</span>
  <span style="margin-left:8px;padding:2px 8px;border-radius:20px;background:rgba(0,255,209,0.08);border:1px solid rgba(0,255,209,0.15);font-size:10px;color:#00FFD1;font-weight:500;">MAINNET LAUNCH</span>
</td></tr>

<tr><td style="padding:28px 0 8px;">
  <h1 style="margin:0;font-size:28px;font-weight:600;color:#fff;letter-spacing:-0.03em;">We're live on Ethereum mainnet.</h1>
</td></tr>

<tr><td style="padding:0 0 28px;">
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.7;">
    You signed up for early access to Aevum Protocol. Today, September 4th 2026, we deployed to Ethereum mainnet as part of ETHOnline 2026. The Verifiable Backtest Oracle (VBO) is live — and you're among the first to know.
  </p>
</td></tr>

<tr><td style="padding:0 0 12px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,168,255,0.04);border:1px solid rgba(0,168,255,0.15);border-radius:12px;padding:24px;">
    <tr><td style="padding-bottom:14px;font-size:11px;color:#00A8FF;text-transform:uppercase;letter-spacing:0.12em;font-weight:500;">What is the VBO?</td></tr>
    <tr><td style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;padding-bottom:16px;">
      The Verifiable Backtest Oracle issues on-chain certificates proving your trading strategy was defined <em style="color:rgba(255,255,255,0.7);">before</em> its forward test window — making cherry-picking and look-ahead bias cryptographically impossible.
    </td></tr>
    <tr><td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);">
      <table width="100%"><tr>
        <td style="font-size:12px;color:rgba(255,255,255,0.3);">Layer 1 — Aevum</td>
        <td align="right" style="font-size:12px;color:rgba(255,255,255,0.6);">Strategy hash sealed on-chain before window opens</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 0;">
      <table width="100%"><tr>
        <td style="font-size:12px;color:rgba(255,255,255,0.3);">Layer 2 — Atlas Oracle</td>
        <td align="right" style="font-size:12px;color:rgba(255,255,255,0.6);">BTC/USD prices cryptographically verified on-chain</td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:0 0 12px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;">
    <tr><td style="padding-bottom:14px;font-size:11px;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:0.12em;">Early access — limited spots</td></tr>
    <tr><td style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8;padding-bottom:16px;">
      As an early waitlist member, you get access to the Basic plan at launch. Commit your first strategy and receive an on-chain certificate proving your backtest is real.
    </td></tr>
    <tr><td>
      <table width="100%">
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Certificate price</td><td align="right" style="font-size:12px;color:#fff;font-weight:600;">$500</td></tr></table></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Forward window</td><td align="right" style="font-size:12px;color:rgba(255,255,255,0.6);">7, 14, or 30 days</td></tr></table></td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Oracle</td><td align="right" style="font-size:12px;color:rgba(255,255,255,0.6);">Atlas Oracle (CoinMarketCap)</td></tr></table></td></tr>
        <tr><td style="padding:8px 0;"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Network</td><td align="right" style="font-size:12px;color:rgba(255,255,255,0.6);">Ethereum Mainnet</td></tr></table></td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:16px 0 24px;text-align:center;">
  <a href="https://aevum-frontend.vercel.app/vbo" style="display:inline-block;padding:14px 32px;background:#00A8FF;color:#06090F;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-right:8px;">Commit your strategy ↗</a>
  <a href="https://aevumprotocol.io" style="display:inline-block;padding:14px 24px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:8px;text-decoration:none;font-size:14px;">Learn more</a>
</td></tr>

<tr><td style="padding:20px 0 0;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
  <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.2);">Aevum Protocol Inc. · Delaware C-Corp · ETHOnline 2026 Finalist</p>
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.15);">
    <a href="https://aevumprotocol.io" style="color:rgba(255,255,255,0.2);text-decoration:none;">aevumprotocol.io</a> · 
    <a href="mailto:support@aevumprotocol.io" style="color:rgba(255,255,255,0.2);text-decoration:none;">support@aevumprotocol.io</a>
  </p>
  <p style="margin:8px 0 0;font-size:10px;color:rgba(255,255,255,0.1);">You received this because you signed up for early access at aevumprotocol.io</p>
</td></tr>

</table></td></tr></table>
</body></html>`;

async function sendEmail(to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Jonathan @ Aevum Protocol <jonathan@aevumprotocol.io>',
      to,
      subject: "Aevum Protocol is live on Ethereum mainnet — you're in",
      html,
    }),
  });
  const data = await res.json();
  return data;
}

async function main() {
  console.log(`Sending launch announcement to ${EMAILS.length} waitlist members...\n`);

  for (const email of EMAILS) {
    try {
      const result = await sendEmail(email);
      console.log(`✓ Sent to ${email} — ID: ${result.id}`);
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`✗ Failed for ${email}:`, err.message);
    }
  }

  console.log('\n✓ Launch announcement complete.');
}

main().catch(console.error);
