/**
 * sendCertificateEmail.js — Certificate delivery email
 * Run after attestation: node scripts/sendCertificateEmail.js
 * Fill in DETAILS below before running
 */

require('dotenv').config();

// ─── FILL THESE IN BEFORE RUNNING ─────────────────────────────────────────────
const DETAILS = {
  email: "USER_EMAIL_HERE",
  strategyName: "BTC RSI Reversal v1",
  certId: "3",
  certUrl: "https://aevum-frontend.vercel.app/certificate/3",
  twr: "+3.82%",
  btcHold: "+3.72%",
  alpha: "+0.10%",
  regime: "Neutral",
  windowDays: "7",
  windowStart: "August 27, 2026",
  windowEnd: "September 3, 2026",
  exchange: "Coinbase",
  txHash: "0x2abad89aa06b80d16b796a03446a9276d9e07bb98f83bbfbe461b7ac5667bf28",
  etherscanBase: "https://sepolia.etherscan.io",
};
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
</head>
<body style="margin:0;padding:0;background:#000000;" bgcolor="#000000">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background:#000000;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#06090F" style="background:#06090F;max-width:540px;width:100%;border-radius:16px;border:1px solid #1a1f2e;padding:32px;">

  <!-- Header -->
  <tr><td style="padding-bottom:24px;border-bottom:1px solid #1a1f2e;">
    <span style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">Aevum</span>
    <span style="font-size:14px;color:rgba(255,255,255,0.3);"> Protocol</span>
    <span style="display:inline-block;margin-left:10px;padding:3px 10px;border-radius:20px;background:#0a1a12;border:1px solid #22c55e;font-size:10px;color:#22c55e;font-weight:600;letter-spacing:0.06em;vertical-align:middle;">CERTIFICATE ISSUED</span>
  </td></tr>

  <!-- Headline -->
  <tr><td style="padding:28px 0 12px;">
    <div style="font-size:11px;color:#555f6e;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">Certificate #${DETAILS.certId} &middot; ${DETAILS.exchange}</div>
    <h1 style="margin:0;font-size:30px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;line-height:1.25;">Your certificate<br>is ready.</h1>
  </td></tr>

  <!-- Intro -->
  <tr><td style="padding:0 0 24px;">
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.85;">Certificate #${DETAILS.certId} has been issued on the Ethereum blockchain. Your strategy has been independently verified &mdash; share this link with allocators, funds, or anyone who needs to verify your track record.</p>
  </td></tr>

  <!-- Performance card -->
  <tr><td style="padding:0 0 10px;">
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0d14" style="background:#0a0d14;border:1px solid #1a1f2e;border-radius:12px;">
      <tr><td style="padding:20px;">
        <div style="font-size:10px;color:#22c55e;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px;">Certificate #${DETAILS.certId} &mdash; Verified performance</div>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Strategy</td>
              <td align="right" style="font-size:12px;color:#e5e7eb;font-weight:500;">${DETAILS.strategyName}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Time-Weighted Return</td>
              <td align="right" style="font-size:22px;font-weight:700;color:#22c55e;">${DETAILS.twr}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">BTC hold benchmark</td>
              <td align="right" style="font-size:13px;color:#9ca3af;">${DETAILS.btcHold}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Alpha</td>
              <td align="right" style="font-size:13px;font-weight:600;color:#00FFD1;">${DETAILS.alpha}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Market regime</td>
              <td align="right" style="font-size:13px;color:#00A8FF;">${DETAILS.regime}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1a1f2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Forward window</td>
              <td align="right" style="font-size:12px;color:#9ca3af;">${DETAILS.windowDays} days &middot; ${DETAILS.windowStart} &rarr; ${DETAILS.windowEnd}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Transaction</td>
              <td align="right"><a href="${DETAILS.etherscanBase}/tx/${DETAILS.txHash}" style="font-family:monospace;font-size:11px;color:#00A8FF;text-decoration:none;">${DETAILS.txHash.slice(0,16)}...${DETAILS.txHash.slice(-6)} &nearr;</a></td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- 2-layer verification -->
  <tr><td style="padding:10px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#030d1a" style="background:#030d1a;border:1px solid #0a2a4a;border-radius:10px;">
      <tr><td style="padding:18px;">
        <div style="font-size:10px;color:#00A8FF;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">2-layer verification</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;border-bottom:1px solid #0a1a2e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Layer 1 &mdash; Aevum</td>
              <td align="right" style="font-size:11px;color:#22c55e;">Strategy hash sealed on-chain &checkmark;</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:6px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#6b7280;">Layer 2 &mdash; Atlas Oracle</td>
              <td align="right" style="font-size:11px;color:#22c55e;">BTC/USD prices verified on-chain &checkmark;</td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:24px 0;text-align:center;">
    <a href="${DETAILS.certUrl}" style="display:inline-block;padding:14px 40px;background:#00A8FF;color:#06090F;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:-0.01em;">View your certificate &nearr;</a>
    <div style="margin-top:10px;font-size:12px;color:#374151;">Share this link with allocators to verify your track record</div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 0 0;border-top:1px solid #1a1f2e;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-size:11px;color:#374151;">Aevum Protocol Inc. &middot; Delaware C-Corp</div>
        <div style="font-size:10px;color:#1f2937;margin-top:3px;">Powered by Atlas Oracle &middot; ETHOnline 2026</div>
      </td>
      <td align="right">
        <a href="mailto:attestation@aevumprotocol.io" style="font-size:11px;color:#374151;text-decoration:none;">attestation@aevumprotocol.io</a>
      </td>
    </tr></table>
    <div style="margin-top:10px;font-size:10px;color:#1f2937;">Questions about your certificate? Reply to this email.</div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Aevum Protocol <attestation@aevumprotocol.io>',
      to: DETAILS.email,
      subject: `Your VBO Certificate #${DETAILS.certId} is ready — ${DETAILS.strategyName}`,
      html,
    }),
  });

  const data = await res.json();
  console.log('Certificate email sent:', data);
}

main().catch(console.error);
