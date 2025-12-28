const fs = require('fs');
const path = require('path');

// Since we don't have image processing libraries, let's just copy the 1024x1024 icon
// iOS will handle the resizing automatically for the single universal icon

const sourceIcon = path.join(__dirname, 'public', 'favicon.png');
const destIcon = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-1024.png');

// Check if source exists
if (!fs.existsSync(sourceIcon)) {
  console.error('Source icon not found:', sourceIcon);
  process.exit(1);
}

// Copy the icon
fs.copyFileSync(sourceIcon, destIcon);
console.log('✅ Icon copied to:', destIcon);

// Update Contents.json to use the new icon
const contentsPath = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'Contents.json');
const contents = {
  "images": [
    {
      "filename": "AppIcon-1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
};

fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));
console.log('✅ Contents.json updated');
console.log('✅ iOS app icon is now configured!');
