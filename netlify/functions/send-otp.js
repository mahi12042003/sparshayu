exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { phone, otp } = JSON.parse(event.body || '{}');
    if (!phone || !otp) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone and OTP required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    const fetchRes = await fetch(`${supabaseUrl}/rest/v1/otp_store?phone=eq.${phone}&select=otp,expiry`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const records = await fetchRes.json();

    if (!records || records.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'OTP not found. Please resend.' }) };
    }

    const record = records[0];

    if (new Date() > new Date(record.expiry)) {
      await fetch(`${supabaseUrl}/rest/v1/otp_store?phone=eq.${phone}`, {
        method: 'DELETE',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'OTP expired. Please resend.' }) };
    }

    if (record.otp !== otp.toString()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Wrong OTP. Please try again.' }) };
    }

    await fetch(`${supabaseUrl}/rest/v1/otp_store?phone=eq.${phone}`, {
      method: 'DELETE',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('verify-otp error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error. Try again.' }) };
  }
};
