import { createClientFromRequest } from './_shared/supabaseClient.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const to = payload?.to;
    const body = payload?.body;

    if (!to || !body) {
      return Response.json({ error: 'to and body are required' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = Deno.env.get('TWILIO_FROM');

    if (!accountSid || !authToken || !from) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const formBody = new URLSearchParams({
      To: to,
      From: from,
      Body: body
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.message || 'SMS send failed' }, { status: 400 });
    }

    return Response.json({ success: true, sid: data?.sid });
  } catch (error) {
    console.error('Error in send-sms:', error);
    return Response.json({ error: error.message || 'SMS send error' }, { status: 500 });
  }
});
