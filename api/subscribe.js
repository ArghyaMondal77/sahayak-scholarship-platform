export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, schemeId, schemeName, deadlineDate, officialUrl, documents } = req.body || {};

    const recipient = String(email ?? '').trim();
    if (!recipient) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (deadlineDate === undefined || deadlineDate === null || deadlineDate === '') {
      return res.status(400).json({ error: 'Deadline date is required' });
    }

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(200).json({
        ok: true,
        mode: 'demo',
        message: 'Reminder scheduled (Demo Mode — add Gmail credentials to send live emails)',
      });
    }

    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const documentList = Array.isArray(documents) ? documents.join(', ') : (documents ?? '');
    const body = [
      'Your Sahayak scheme reminder',
      '',
      `Scheme: ${schemeName ?? ''}`,
      `Deadline: ${deadlineDate}`,
      `Official link: ${officialUrl ?? ''}`,
      `Documents: ${documentList}`,
    ].join('\n');

    try {
      await transporter.sendMail({
        from: EMAIL_USER,
        to: recipient,
        subject: 'Sahayak reminder: ' + schemeName,
        text: body,
      });
    } catch (err) {
      console.error('Email send failed:', err?.message);
      return res.status(502).json({ error: 'Could not send the email right now' });
    }

    return res.status(200).json({ ok: true, mode: 'live', message: 'Confirmation email sent' });
  } catch (err) {
    console.error('Subscribe handler error:', err?.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
