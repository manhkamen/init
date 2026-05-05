const fs = require('fs');
const path = require('path');

// Path to the original TSX file
const tsxPath = path.join(__dirname, 'elon_musk.txt');
const raw = fs.readFileSync(tsxPath, 'utf-8');

// Extract the exported array (assumes `export default [...]`)
const match = raw.match(/export\s+default\s+(\[.*\])/s);
if (!match) {
  throw new Error('Could not find exported array in elon_musk.tsx');
}
let videos = eval('(' + match[1] + ')'); // naive eval, works for local data

// Helper to extract YouTube ID from url
function getId(url) {
  const m = url && url.match(/v=([^&]+)/);
  return m ? m[1] : null;
}

// Simple keyword extraction (words >=4 chars, lower‑cased)
function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  return Array.from(new Set(words));
}

// Enrich each video with id and a keywords array
videos = videos.map(v => {
  const id = getId(v.url);
  const kw = [...new Set([...extractKeywords(v.title), ...extractKeywords(v.description)])];
  return { ...v, id, keywords: kw };
});

module.exports = videos;
