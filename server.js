/*
  HomeAI — Smart Home Assistant Backend
  ======================================
  This is the server that:
  1. Serves your smart home web app
  2. Talks to Claude AI on your behalf (keeps API key safe)
  3. Lets Claude control your virtual home devices

  To start: npm start
  Then open: http://localhost:3000
*/

require('dotenv').config();
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Validate API key on startup ---
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌  ERROR: ANTHROPIC_API_KEY is missing!');
  console.error('   1. Copy .env.example to .env');
  console.error('   2. Open .env and paste your Anthropic API key');
  console.error('   3. Run "npm start" again\n');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Redirect root to smart home app ---
app.get('/', (req, res) => {
  res.redirect('/smarthome.html');
});

/*
  POST /api/chat
  --------------
  The frontend sends the conversation and Claude responds.
  Claude can use "tools" to control home devices.
*/
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, tools, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages must be an array.' });
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: system || 'You are a helpful smart home assistant.',
      messages,
      tools: tools || []
    });

    res.json(response);
  } catch (error) {
    console.error('Claude API error:', error.message);

    if (error.status === 401) {
      res.status(401).json({ error: 'Invalid API key. Please check your .env file.' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    } else {
      res.status(500).json({ error: error.message || 'Something went wrong. Please try again.' });
    }
  }
});

/*
  POST /api/save-home-name
  -------------------------
  Saves the home name to .env so it persists across restarts.
  (Optional enhancement — currently the name is kept in browser memory.)
*/
app.post('/api/save-home-name', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name' });
  }
  res.json({ success: true, name: name.trim() });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log('\n');
  console.log('  🏠  HomeAI — Smart Home Assistant');
  console.log('  ====================================');
  console.log(`  ✅  Server running at: http://localhost:${PORT}`);
  console.log(`  🤖  AI Brain: Claude Opus 4.6 (with Adaptive Thinking)`);
  console.log('');
  console.log('  Open your browser and go to:');
  console.log(`  👉  http://localhost:${PORT}`);
  console.log('');
});
