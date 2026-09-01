/**
 * sendCertificateEmail.js — Send certificate delivery email to user
 * Run after attestation: node scripts/sendCertificateEmail.js
 * 
 * Fill in the details below before running
 */

require('dotenv').config();

const DETAILS = {
  email: "USER_EMAIL_HERE",
  strategyName: "STRATEGY_NAME_HERE",
  certId: "3",
  certUrl: "https://aevum-frontend.vercel.app/certificate/3",
  twr: "+2.45%",
  btcHold: "+1.82%",
  alpha: "+0.63%",
  regime: "Neutral",
  windowDays: "7",
  windowEnd: "September 4, 2026",
  txHash: "0x...",
};

async function main() {
  const html = `<html><body style="margin:0;padding:0;background:#06090F;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#06090F;padding:40px 0;">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
  <span style="font-size:13px;font-weight:600;color:#fff;">Aevum Protocol</span>
  <span style="margin-left:8px;padding:2px 8px;border-radius:20px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);font-size:10px;color:#22c55e;">CERTIFICATE ISSUED</span>
</td></tr>
<tr><td style="padding:28px 0 8px;">
  <h1 style="margin:0;font-size:28px;font-weight:600;color:#fff;letter-spacing:-0.03em;">Your certificate is ready.</h1>
</td></tr>
<tr><td style="padding:0 0 28px;">
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;">Certificate #${DETAILS.certId} has been issued on the Ethereum blockchain. Your strategy has been verified — share this link with allocators.</p>
</td></tr>
<tr><td style="padding:0 0 12px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(34,197,94,0.03);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:20px;">
    <tr><td style="padding-bottom:14px;font-size:10px;color:#22c55e;text-transform:uppercase;letter-spacing:0.12em;">Certificate #${DETAILS.certId} — Performance</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Strategy</td><td align="right" style="font-size:12px;color:rgba(255,255,255,0.7);font-weight:500;">${DETAILS.strategyName}</td></tr></table></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">TWR (Time-Weighted Return)</td><td align="right" style="font-size:14px;color:#22c55e;font-weight:700;">${DETAILS.twr}</td></tr></table></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">BTC hold benchmark</td><td align="right" style="font-size:12px;color:rgba(255,255,255,0.5);">${DETAILS.btcHold}</td></tr></table></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Alpha</td><td align="right" style="font-size:12px;color:#00FFD1;font-weight:600;">${DETAILS.alpha}</td></tr></table></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Market regime</td><td align="right" style="font-size:12px;color:#00A8FF;">${DETAILS.regime}</td></tr></table></td></tr>
    <tr><td style="padding:8px 0;"><table width="100%"><tr><td style="font-size:12px;color:rgba(255,255,255,0.3);">Forward window</td><td align="right" style="font-size:12px;color:rgba(255,255,255,0.5);">${DETAILS.windowDays} days · closed ${DETAILS.windowEnd}</td></tr></table></td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 0 12px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,168,255,0.04);border:1px solid rgba(0,168,255,0.15);border-radius:12px;padding:16px;">
    <tr><td style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.8;">
      This certificate proves your strategy ran with zero look-ahead bias — verified by two independent layers: Aevum's on-chain commitment proof and Atlas Oracle's cryptographically signed BTC/USD prices. Share this link with allocators, funds, or anyone who needs to verify your track record.
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:8px 0 24px;text-align:center;">
  <a href="${DETAILS.certUrl}" style="display:inline-block;padding:12px 24px;background:#00A8FF;color:#06090F;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">View your certificate ↗</a>
</td></tr>
<tr><td style="padding:16px 0 0;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
  <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.2);">Aevum Protocol Inc. · Delaware C-Corp</p>
  <p style="margin:0;font-size:11px;"><a href="mailto:support@aevumprotocol.io" style="color:rgba(255,255,255,0.2);text-decoration:none;">support@aevumprotocol.io</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Aevum Protocol <jonathan@aevumprotocol.io>',
      to: DETAILS.email,
      subject: `Your VBO Certificate #${DETAILS.certId} is ready — ${DETAILS.strategyName}`,
      html,
    }),
  });

  const data = await res.json();
  console.log('Certificate email sent:', data);
}

main().catch(console.error);
