import { createClientFromRequest } from './_shared/supabaseClient.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const to = payload?.to;
    const subject = payload?.subject;
    const html = payload?.html;
    const text = payload?.text;
    const from = payload?.from || Deno.env.get('EMAIL_FROM');

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: 'to, subject, and html/text are required' }, { status: 400 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.message || 'Email send failed' }, { status: 400 });
    }

    return Response.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Error in send-email:', error);
    return Response.json({ error: error.message || 'Email send error' }, { status: 500 });
  }
});
