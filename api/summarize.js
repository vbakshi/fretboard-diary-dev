import './loadEnv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ chordsUsed: [], tabsDiscussed: false, summary: null });
  }

  const { videoId, transcript, title } = req.body || {};
  if (!videoId || !transcript?.trim()) {
    return res.status(200).json({ chordsUsed: [], tabsDiscussed: false, summary: null });
  }

  const systemPrompt = `You are a guitar teacher's assistant. Return ONLY valid JSON, no markdown, no explanation.`;
  const userPrompt = `Below is the auto-generated transcript of a YouTube guitar lesson titled "${title || 'Unknown'}".

Transcript: ${transcript}

Return ONLY valid JSON in this exact format:
{
  "chordsUsed": ["G", "Em", "C", "D"],
  "tabsDiscussed": true,
  "summary": "One sentence under 20 words describing what is taught."
}
Only include chords explicitly named in the transcript. If none found, return empty array for chordsUsed.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    let cleaned = content.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);

    return res.status(200).json({
      chordsUsed: Array.isArray(parsed.chordsUsed) ? parsed.chordsUsed : [],
      tabsDiscussed: Boolean(parsed.tabsDiscussed),
      summary: parsed.summary || null,
    });
  } catch {
    return res.status(200).json({ chordsUsed: [], tabsDiscussed: false, summary: null });
  }
}
