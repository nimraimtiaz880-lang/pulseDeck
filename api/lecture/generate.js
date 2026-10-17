// Optional serverless AI endpoint. Set OPENAI_API_KEY in your hosting environment.
// The key must never be placed in VITE_ frontend variables.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { title = 'Lecture', action = 'summary', content = '' } = req.body || {};
  if (!content.trim()) return res.status(400).json({ error: 'Lecture content is required' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI endpoint is not configured' });
  const instructions = {
    summary: 'Summarize the lecture into a concise title, 5-8 key ideas, key terms, and 3 takeaways.',
    quiz: 'Create 5 multiple-choice questions based only on the lecture. Include four plausible options, identify the correct answer and explain why. Do not invent facts.',
    scenario: 'Create two realistic scenario-based learning activities grounded in the lecture. Include situation, student task, guiding questions, and teacher notes.',
    discussion: 'Create 5 open-ended classroom discussion prompts grounded in the lecture, with one follow-up for each.',
    poll: 'Create 3 short classroom poll questions grounded in the lecture, with options and the intended answer where applicable.'
  };
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4, messages: [
        { role: 'system', content: 'You are PulseDeck, a careful teaching assistant. Use only the supplied lecture content for factual claims. If content is missing, say so. Output editable plain text. Teacher must review before use.' },
        { role: 'user', content: `Lecture title: ${title}\nRequested output: ${instructions[action] || instructions.summary}\n\nLecture content:\n${content.slice(0, 80000)}` }
      ] })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: data.error?.message || 'AI provider request failed' });
    return res.status(200).json({ output: data.choices?.[0]?.message?.content || '' });
  } catch (e) { return res.status(500).json({ error: 'Could not generate content' }); }
}
