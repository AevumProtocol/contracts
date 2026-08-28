/**
 * attestationReminder.js — Daily cron script
 * Checks Supabase for commitments whose windows close within 24 hours
 * Emails the user and jonathan@aevumprotocol.io with next steps
 * 
 * Run manually: node scripts/attestationReminder.js
 * Schedule: cron job daily at 9am MT — 0 15 * * * node /path/to/attestationReminder.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { realtime: { transport: ws } }
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendReminderEmail(commitment) {
  const windowEnd = new Date(commitment.window_end);
  const windowEndFormatted = windowEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const html = `<html><body style="margin:0;padding:0;background:#06090F;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06090F;padding:40px 0;">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
  <span style="font-size:13px;font-weight:600;color:#fff;">Aevum</span>
  <span style="font-size:13px;color:rgba(255,255,255,0.25);"> Protocol</span>
</td></tr>
<tr><td style="padding:28px 0 8px;">
  <h1 style="margin:0;font-size:24px;font-weight:600;color:#fff;letter-spacing:-0.03em;">Your forward window closes tomorrow.</h1>
</td></tr>
<tr><td style="padding:0 0 24px;">
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;">
    Your VBO commitment window for <strong style="color:rgba(255,255,255,0.7);">${commitment.strategy_name}</strong> closes on <strong style="color:#fbbf24;">${windowEndFormatted}</strong>. Time to collect your trading logs.
  </p>
</td></tr>
<tr><td style="padding:0 0 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.15);border-radius:12px;padding:20px;">
    <tr><td style="padding-bottom:12px;font-size:11px;color:#fbbf24;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;">Action required</td></tr>
    <tr><td style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.8;">
      <div style="margin-bottom:8px;"><strong style="color:rgba(255,255,255,0.8);">1. Export your trading history</strong> from ${commitment.exchange} for the window period.</div>
      <div style="margin-bottom:8px;"><strong style="color:rgba(255,255,255,0.8);">2. Email your logs</strong> to <a href="mailto:support@aevumprotocol.io" style="color:#00A8FF;text-decoration:none;">support@aevumprotocol.io</a> with subject: "VBO Attestation - ${commitment.strategy_name}"</div>
      <div><strong style="color:rgba(255,255,255,0.8);">3. Receive your certificate</strong> — we'll calculate your TWR, attest on-chain, and send you a permanent certificate link.</div>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 0 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;">
    <tr><td style="padding-bottom:10px;font-size:10px;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:0.1em;">Your commitment details</td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:11px;color:rgba(255,255,255,0.3);">Strategy</td><td align="right" style="font-size:11px;color:rgba(255,255,255,0.6);">${commitment.strategy_name}</td></tr></table></td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:11px;color:rgba(255,255,255,0.3);">Exchange</td><td align="right" style="font-size:11px;color:rgba(255,255,255,0.6);">${commitment.exchange}</td></tr></table></td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:11px;color:rgba(255,255,255,0.3);">Window closes</td><td align="right" style="font-size:11px;color:#fbbf24;">${windowEndFormatted}</td></tr></table></td></tr>
    <tr><td style="padding:6px 0;"><table width="100%"><tr><td style="font-size:11px;color:rgba(255,255,255,0.3);">Strategy hash</td><td align="right" style="font-family:monospace;font-size:10px;color:rgba(255,255,255,0.3);">${commitment.strategy_hash.slice(0,16)}...${commitment.strategy_hash.slice(-6)}</td></tr></table></td></tr>
  </table>
</td></tr>
<tr><td style="padding:16px 0 0;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">Aevum Protocol Inc. · <a href="mailto:support@aevumprotocol.io" style="color:rgba(255,255,255,0.2);text-decoration:none;">support@aevumprotocol.io</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  // Email to user
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Aevum Protocol <jonathan@aevumprotocol.io>',
      to: commitment.email,
      subject: `Action required: Your VBO window closes tomorrow — ${commitment.strategy_name}`,
      html,
    }),
  });

  // Notify yourself
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Aevum Protocol <jonathan@aevumprotocol.io>',
      to: 'jonathan@aevumprotocol.io',
      subject: `[ADMIN] VBO window closing tomorrow — ${commitment.strategy_name} (${commitment.email})`,
      html: `<p style="font-family:sans-serif;color:#333;">Window closing tomorrow for:<br><br>
        Strategy: ${commitment.strategy_name}<br>
        User: ${commitment.email}<br>
        Wallet: ${commitment.wallet_address}<br>
        Exchange: ${commitment.exchange}<br>
        Window end: ${windowEndFormatted}<br>
        Tx: ${commitment.tx_hash}<br>
        Strategy hash: ${commitment.strategy_hash}
      </p>`,
    }),
  });

  console.log(`✓ Reminder sent to ${commitment.email} for "${commitment.strategy_name}"`);
}

async function main() {
  console.log("Checking for windows closing within 24 hours...");

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('strategy_commitments')
    .select('*')
    .eq('status', 'pending')
    .gte('window_end', now.toISOString())
    .lte('window_end', in24h.toISOString());

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No windows closing in the next 24 hours.');
    process.exit(0);
  }

  console.log(`Found ${data.length} window(s) closing within 24 hours.`);

  for (const commitment of data) {
    await sendReminderEmail(commitment);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
