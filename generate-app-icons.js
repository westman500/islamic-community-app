import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceIcon = 'resources/icononly_nobuffer.png';

// iOS icon sizes
const iosSizes = [
  { size: 20, scale: 2, name: 'AppIcon-20x20@2x.png' },
  { size: 20, scale: 3, name: 'AppIcon-20x20@3x.png' },
  { size: 29, scale: 2, name: 'AppIcon-29x29@2x.png' },
  { size: 29, scale: 3, name: 'AppIcon-29x29@3x.png' },
  { size: 40, scale: 2, name: 'AppIcon-40x40@2x.png' },
  { size: 40, scale: 3, name: 'AppIcon-40x40@3x.png' },
  { size: 60, scale: 2, name: 'AppIcon-60x60@2x.png' },
  { size: 60, scale: 3, name: 'AppIcon-60x60@3x.png' },
  { size: 76, scale: 1, name: 'AppIcon-76x76@1x.png' },
  { size: 76, scale: 2, name: 'AppIcon-76x76@2x.png' },
  { size: 83.5, scale: 2, name: 'AppIcon-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, name: 'AppIcon-1024x1024@1x.png' }
];

// Android icon sizes
const androidSizes = [
  { size: 36, folder: 'drawable-ldpi', name: 'ic_launcher.png' },
  { size: 48, folder: 'drawable-mdpi', name: 'ic_launcher.png' },
  { size: 72, folder: 'drawable-hdpi', name: 'ic_launcher.png' },
  { size: 96, folder: 'drawable-xhdpi', name: 'ic_launcher.png' },
  { size: 144, folder: 'drawable-xxhdpi', name: 'ic_launcher.png' },
  { size: 192, folder: 'drawable-xxxhdpi', name: 'ic_launcher.png' },
  // Foreground icons (for adaptive icons)
  { size: 108, folder: 'drawable-ldpi', name: 'ic_launcher_foreground.png' },
  { size: 108, folder: 'drawable-mdpi', name: 'ic_launcher_foreground.png' },
  { size: 162, folder: 'drawable-hdpi', name: 'ic_launcher_foreground.png' },
  { size: 216, folder: 'drawable-xhdpi', name: 'ic_launcher_foreground.png' },
  { size: 324, folder: 'drawable-xxhdpi', name: 'ic_launcher_foreground.png' },
  { size: 432, folder: 'drawable-xxxhdpi', name: 'ic_launcher_foreground.png' }
];

async function generateIcons() {
  console.log('🎨 Generating app icons...\n');

  // Create iOS icons
  console.log('📱 Generating iOS icons...');
  const iosIconsPath = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  if (!fs.existsSync(iosIconsPath)) {
    fs.mkdirSync(iosIconsPath, { recursive: true });
  }

  for (const icon of iosSizes) {
    const size = Math.round(icon.size * icon.scale);
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(iosIconsPath, icon.name));
    console.log(`  ✓ ${icon.name} (${size}x${size})`);
  }

  // Create Contents.json for iOS
  const contentsJson = {
    images: iosSizes.map(icon => ({
      filename: icon.name,
      idiom: icon.size >= 76 ? 'ipad' : (icon.size === 1024 ? 'ios-marketing' : 'iphone'),
      scale: `${icon.scale}x`,
      size: `${icon.size}x${icon.size}`
    })),
    info: {
      author: 'xcode',
      version: 1
    }
  };

  fs.writeFileSync(
    path.join(iosIconsPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('  ✓ Contents.json\n');

  // Create Android icons
  console.log('🤖 Generating Android icons...');
  for (const icon of androidSizes) {
    const androidIconPath = path.join('android/app/src/main/res', icon.folder);
    if (!fs.existsSync(androidIconPath)) {
      fs.mkdirSync(androidIconPath, { recursive: true });
    }

    await sharp(sourceIcon)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(androidIconPath, icon.name));
    console.log(`  ✓ ${icon.folder}/${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
