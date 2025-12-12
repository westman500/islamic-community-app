const fs = require('fs');
const { createCanvas } = require('canvas');

// Create 1024x1024 canvas
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Green background (#10b981 - emerald-500)
ctx.fillStyle = '#10b981';
ctx.fillRect(0, 0, 1024, 1024);

// Draw white mosque icon
ctx.fillStyle = '#ffffff';
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 8;

const centerX = 512;
const centerY = 512;
const scale = 1.5; // Make icon bigger and fitting

// Main dome (top center)
ctx.beginPath();
ctx.arc(centerX, centerY - 120 * scale, 80 * scale, Math.PI, 0, false);
ctx.fill();

// Crescent on top of dome
ctx.save();
ctx.translate(centerX, centerY - 200 * scale);
ctx.rotate(-Math.PI / 6);
ctx.beginPath();
ctx.arc(0, 0, 30 * scale, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.fillStyle = '#10b981';
ctx.arc(15 * scale, 0, 30 * scale, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
ctx.fillStyle = '#ffffff';

// Main building body
ctx.fillRect(centerX - 140 * scale, centerY - 40 * scale, 280 * scale, 180 * scale);

// Left minaret
ctx.fillRect(centerX - 200 * scale, centerY - 100 * scale, 40 * scale, 240 * scale);
// Left minaret dome
ctx.beginPath();
ctx.arc(centerX - 180 * scale, centerY - 100 * scale, 30 * scale, Math.PI, 0, false);
ctx.fill();
// Left minaret crescent
ctx.beginPath();
ctx.arc(centerX - 180 * scale, centerY - 140 * scale, 12 * scale, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.fillStyle = '#10b981';
ctx.arc(centerX - 172 * scale, centerY - 140 * scale, 12 * scale, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#ffffff';

// Right minaret
ctx.fillRect(centerX + 160 * scale, centerY - 100 * scale, 40 * scale, 240 * scale);
// Right minaret dome
ctx.beginPath();
ctx.arc(centerX + 180 * scale, centerY - 100 * scale, 30 * scale, Math.PI, 0, false);
ctx.fill();
// Right minaret crescent
ctx.beginPath();
ctx.arc(centerX + 180 * scale, centerY - 140 * scale, 12 * scale, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.fillStyle = '#10b981';
ctx.arc(centerX + 188 * scale, centerY - 140 * scale, 12 * scale, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#ffffff';

// Main entrance arch
ctx.beginPath();
ctx.arc(centerX, centerY + 60 * scale, 50 * scale, Math.PI, 0, false);
ctx.fillStyle = '#10b981';
ctx.fill();

// Door
ctx.fillStyle = '#10b981';
ctx.fillRect(centerX - 50 * scale, centerY + 60 * scale, 100 * scale, 80 * scale);

// Windows (decorative arches)
// Left window
ctx.fillStyle = '#10b981';
ctx.beginPath();
ctx.arc(centerX - 80 * scale, centerY, 25 * scale, Math.PI, 0, false);
ctx.fill();
ctx.fillRect(centerX - 105 * scale, centerY, 50 * scale, 40 * scale);

// Right window
ctx.beginPath();
ctx.arc(centerX + 80 * scale, centerY, 25 * scale, Math.PI, 0, false);
ctx.fill();
ctx.fillRect(centerX + 55 * scale, centerY, 50 * scale, 40 * scale);

// Save to resources/icon.png
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('resources/icon.png', buffer);
console.log('✅ Icon generated: resources/icon.png');
console.log('📱 Run: npx @capacitor/assets generate --android');
