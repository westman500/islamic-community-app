const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iosIconPath = path.join(__dirname, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024x1024@1x.png');
const androidRes = path.join(__dirname, 'android/app/src/main/res');

const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

async function generateAndroidIcons() {
  console.log('📱 Copying iOS icon to Android...\n');
  
  if (!fs.existsSync(iosIconPath)) {
    console.error('❌ iOS icon not found at:', iosIconPath);
    process.exit(1);
  }

  for (const { folder, size } of sizes) {
    const outputPath = path.join(androidRes, folder, 'ic_launcher.png');
    const outputPathRound = path.join(androidRes, folder, 'ic_launcher_round.png');
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    // Generate square icon
    await sharp(iosIconPath)
      .resize(size, size)
      .toFile(outputPath);
    
    // Generate round icon
    await sharp(iosIconPath)
      .resize(size, size)
      .toFile(outputPathRound);
    
    console.log(`✅ ${folder}: ${size}x${size} (ic_launcher.png & ic_launcher_round.png)`);
  }
  
  // Generate foreground for adaptive icon
  const foregroundPath = path.join(androidRes, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png');
  await sharp(iosIconPath)
    .resize(192, 192)
    .toFile(foregroundPath);
  console.log('✅ Generated ic_launcher_foreground.png');
  
  console.log('\n✅ Android icons generated successfully!');
}

generateAndroidIcons().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
