const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const TRANSCRIPT_DIR = path.join(__dirname, 'transcript');

// Load pre-generated data JSON (video metadata)
const dataPath = path.join(__dirname, 'data.json');
let videos = [];
if (fs.existsSync(dataPath)) {
  videos = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
} else {
  console.error('Data file not found. Run generate_data.js first.');
}

// Helper for pagination
function paginate(arr, page = 1, limit = 20) {
  const total = arr.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = arr.slice(start, end);
  return { page, limit, total, totalPages, data };
}

// GET /api/videos?page=&limit=
app.get('/api/videos', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = paginate(videos, page, limit);
  res.json(result);
});

// GET /api/videos/:id/transcript
app.get('/api/videos/:id/transcript', (req, res) => {
  const id = req.params.id;
  const video = videos.find(v => v.id === id || v.url?.includes(id));
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  const transcriptPath = path.join(TRANSCRIPT_DIR, video.transcript);
  if (!fs.existsSync(transcriptPath)) {
    return res.status(404).json({ error: 'Transcript file not found' });
  }
  const content = fs.readFileSync(transcriptPath, 'utf-8');
  res.type('text/plain').send(content);
});

// Simple keyword extraction (title + description words)
function extractKeywords(video) {
  const text = `${video.title} ${video.description}`.toLowerCase();
  return text.split(/[^a-z0-9]+/).filter(w => w.length > 3);
}

// GET /api/search?q=&page=&limit=
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  // Compute score for each video
  const results = videos.map(v => {
    let score = 0;
    if (v.title && v.title.toLowerCase().includes(q)) score += 3;
    if (v.description && v.description.toLowerCase().includes(q)) score += 2;
    const transcriptPath = path.join(TRANSCRIPT_DIR, v.transcript);
    let transcriptMatch = false;
    if (fs.existsSync(transcriptPath)) {
      const transcript = fs.readFileSync(transcriptPath, 'utf-8').toLowerCase();
      transcriptMatch = transcript.includes(q);
    }
    if (transcriptMatch) score += 1;
    // keyword match (simple)
    const keywords = extractKeywords(v);
    if (keywords.includes(q)) score += 2;
    return { video: v, score };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => {
      // Return snippet of transcript if available
      const transcriptPath = path.join(TRANSCRIPT_DIR, r.video.transcript);
      let snippet = '';
      if (fs.existsSync(transcriptPath)) {
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        const idx = transcript.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(transcript.length, idx + 90);
          snippet = transcript.substring(start, end).replace(/\n/g, ' ');
        }
      }
      return { ...r.video, score: r.score, snippet };
    });

  const paged = paginate(results, page, limit);
  res.json(paged);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
