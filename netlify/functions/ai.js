exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    // Build content array — support text + optional file (image or PDF)
    let content;
    if (body.file) {
      content = [];
      if (body.file.isImage) {
        content.push({ type: 'image', source: { type: 'base64', media_type: body.file.type, data: body.file.base64 } });
      } else if (body.file.isPdf) {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.file.base64 } });
      }
      content.push({ type: 'text', text: body.prompt });
    } else {
      content = body.prompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'HTTP ' + response.status);
    const text = data.content?.map(b => b.text || '').join('') || '';

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
