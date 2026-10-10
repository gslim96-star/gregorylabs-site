const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'healthy', service: 'Gregory Labs Vapi Telephony Gateway' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const msg = payload.message || payload;
    const eventType = msg.type || 'unknown';

    const callData = msg.call || {};
    const customer = callData.customer || {};
    const callerNum = customer.number || payload.caller || 'Inbound Caller';
    const callId = callData.id || msg.call_id || Date.now().toString();
    const recordingUrl = msg.recordingUrl || callData.recordingUrl || 'N/A';

    const summary = msg.summary || 
                    (msg.analysis && msg.analysis.summary) || 
                    (callData.analysis && callData.analysis.summary) || 
                    'No summary provided.';

    const transcript = msg.transcript || 
                       callData.transcript || 
                       'No audio transcript recorded.';

    const duration = callData.durationMinutes 
      ? `${(callData.durationMinutes * 60).toFixed(0)}s` 
      : 'N/A';

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' CT';

    // Only send email for end-of-call-report or when transcript/summary exists
    if (eventType === 'end-of-call-report' || msg.transcript || msg.summary) {
      const transporter = nodemailer.createTransport({
        host: process.env.LIA_SMTP_SERVER || 'smtp.gmail.com',
        port: parseInt(process.env.LIA_SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.LIA_SMTP_EMAIL || 'lia.gregorylabs@gmail.com',
          pass: process.env.LIA_SMTP_APP_PASSWORD || 'fgvy nmay nbzo yttf',
        },
      });

      const subject = `📞 [Gregory Labs Call] Inbound from ${callerNum} | ${timestamp}`;

      const textBody = `GREGORY LABS LLC — INBOUND CALL INTELLIGENCE
================================================================================
Timestamp: ${timestamp}
Caller ID: ${callerNum}
Call ID:   ${callId}
Duration:  ${duration}
Recording: ${recordingUrl}

AI EXECUTIVE SUMMARY:
--------------------------------------------------------------------------------
${summary}

FULL TRANSCRIPT:
--------------------------------------------------------------------------------
${transcript}

================================================================================
Delivered autonomously by Gregory Labs Edge Gateway
teawithclara.substack.com | gregorylabsllc.com
`;

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
    .header { background: #0f172a; padding: 20px 24px; border-bottom: 2px solid #38bdf8; }
    .header h2 { margin: 0; color: #38bdf8; font-size: 20px; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #0284c7; color: #ffffff; margin-bottom: 12px; }
    .meta-box { background: #0f172a; border-radius: 8px; padding: 14px; margin-bottom: 20px; border: 1px solid #334155; }
    .meta-row { margin-bottom: 6px; font-size: 14px; }
    .meta-label { color: #94a3b8; font-weight: 600; }
    .meta-val { color: #f8fafc; }
    .section-title { color: #38bdf8; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .summary-box { background: #0b132b; border-left: 4px solid #10b981; padding: 14px; border-radius: 0 8px 8px 0; margin-bottom: 20px; line-height: 1.5; font-size: 14px; }
    .transcript-box { background: #0f172a; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; line-height: 1.6; max-height: 350px; overflow-y: auto; border: 1px solid #334155; white-space: pre-wrap; }
    .footer { background: #0f172a; padding: 16px 24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }
    a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📞 Inbound Call Telemetry</h2>
      <p>Gregory Labs LLC Autonomous Telephony Bridge & Voice Agent</p>
    </div>
    <div class="content">
      <span class="badge">CALL COMPLETE</span>
      <div class="meta-box">
        <div class="meta-row"><span class="meta-label">Caller ID:</span> <span class="meta-val"><strong>${callerNum}</strong></span></div>
        <div class="meta-row"><span class="meta-label">Received At:</span> <span class="meta-val">${timestamp}</span></div>
        <div class="meta-row"><span class="meta-label">Duration:</span> <span class="meta-val">${duration}</span></div>
        <div class="meta-row"><span class="meta-label">Audio Recording:</span> <span class="meta-val"><a href="${recordingUrl}" target="_blank">Listen to Recording</a></span></div>
        <div class="meta-row"><span class="meta-label">Session ID:</span> <span class="meta-val"><code>${callId}</code></span></div>
      </div>

      <div class="section-title">🧠 AI Executive Summary</div>
      <div class="summary-box">
        ${summary}
      </div>

      <div class="section-title">📜 Exact Audio Transcript</div>
      <div class="transcript-box">
${transcript}
      </div>
    </div>
    <div class="footer">
      Gregory Labs LLC • Co-Pilot Lia Telephony • Sovereign Intelligence Infrastructure
    </div>
  </div>
</body>
</html>
`;

      const mailOptions = {
        from: `Lia Telephony <${process.env.LIA_SMTP_EMAIL || 'lia.gregorylabs@gmail.com'}>`,
        to: process.env.DAN_WORK_EMAIL || 'daniel@gregorylabsllc.com',
        cc: process.env.DAN_EMAIL || 'gslim96@gmail.com',
        subject: subject,
        text: textBody,
        html: htmlBody,
      };

      await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({ status: 'success', event: eventType, call_id: callId });
  } catch (error) {
    console.error('Vapi Webhook Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
