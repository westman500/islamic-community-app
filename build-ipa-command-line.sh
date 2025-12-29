#!/bin/bash

# Command-line iOS IPA build script
# Alternative to using Xcode GUI

echo "🏗️  Building iOS IPA from command line..."

# Configuration
SCHEME="App"
WORKSPACE="ios/App/App.xcworkspace"
ARCHIVE_PATH="build/App.xcarchive"
EXPORT_PATH="build"
CONFIG="Release"

# Check if workspace exists
if [ ! -f "$WORKSPACE" ]; then
    echo "❌ Workspace not found: $WORKSPACE"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build
mkdir -p build

# Archive
echo "📦 Creating archive..."
xcodebuild -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIG" \
    -archivePath "$ARCHIVE_PATH" \
    -destination 'generic/platform=iOS' \
    archive

if [ $? -ne 0 ]; then
    echo "❌ Archive failed"
    exit 1
fi

echo "✅ Archive created successfully"

# Export IPA
echo "📤 Exporting IPA..."

# Check if exportOptions.plist exists
if [ ! -f "exportOptions.plist" ]; then
    echo "⚠️  exportOptions.plist not found. Creating default..."
    cat > exportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>ad-hoc</string>
    <key>compileBitcode</key>
    <false/>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
EOF
fi

xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist exportOptions.plist

if [ $? -ne 0 ]; then
    echo "❌ Export failed"
    echo "💡 Try opening Xcode and checking signing settings"
    exit 1
fi

echo ""
echo "✅ IPA build complete!"
echo "📍 Location: $EXPORT_PATH/App.ipa"
echo ""
ls -lh "$EXPORT_PATH"/*.ipa
echo ""
