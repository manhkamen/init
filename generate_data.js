const fs = require('fs');
const path = require('path');
const tsxPath = path.join(__dirname, 'elon_musk.txt');
const content = fs.readFileSync(tsxPath, 'utf-8');
// Simple regex to match objects inside the exported array
const objRegex = /\{\s*title:\s*"([^"]+)"[\s\S]*?url:\s*"([^"]+)"[\s\S]*?transcript:\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"[\s\S]*?\}/g;
let match;
const videos = [];
while ((match = objRegex.exec(content)) !== null) {
  const [_, title, url, transcript, date] = match;
  const idMatch = url.match(/v=([^&]+)/);
  const id = idMatch ? idMatch[1] : null;
  videos.push({ id, title, url, transcript, date });
}
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(videos, null, 2));
console.log('Extracted', videos.length, 'videos');
