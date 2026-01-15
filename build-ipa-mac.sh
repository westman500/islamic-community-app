#!/bin/bash
# ========================================
# Masjid iOS IPA Build Script
# Run this on macOS
# ========================================

set -e

echo "========================================"
echo "  MASJID iOS IPA BUILD"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}📁 Working directory: $PWD${NC}"
echo ""

# Check for required tools
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode not found. Install from App Store${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Xcode $(xcodebuild -version | head -1)${NC}"

if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}⚠️ CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
fi
echo -e "${GREEN}✅ CocoaPods $(pod --version)${NC}"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
    npm install
fi

# Build web assets
echo -e "${CYAN}🔨 Building web assets...${NC}"
npm run build
echo ""

# Sync Capacitor
echo -e "${CYAN}📲 Syncing to iOS...${NC}"
npx cap sync ios
echo ""

# Install pods
echo -e "${CYAN}🍫 Installing CocoaPods...${NC}"
cd ios/App
pod install
cd ../..
echo ""

# Create build directory
mkdir -p ios/App/build

# Build archive
echo -e "${CYAN}🔨 Building iOS archive (this may take 5-10 minutes)...${NC}"
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -sdk iphoneos \
  -configuration Release \
  -archivePath ios/App/build/App.xcarchive \
  archive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM=N8ZY2TY3JC \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="Masjid"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Archive build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Archive created${NC}"
echo ""

# Export IPA
echo -e "${CYAN}📦 Exporting IPA...${NC}"
xcodebuild -exportArchive \
  -archivePath ios/App/build/App.xcarchive \
  -exportPath ios/App/build \
  -exportOptionsPlist ios/App/exportOptions.plist

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ IPA export failed!${NC}"
    exit 1
fi

# Rename with timestamp
TIMESTAMP=$(date +"%Y-%m-%d-%H%M")
IPA_NAME="masjid-wallet-v1.2.0-$TIMESTAMP.ipa"
mv ios/App/build/App.ipa "ios/App/build/$IPA_NAME"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ IPA BUILD SUCCESSFUL!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}📍 IPA Location: ios/App/build/$IPA_NAME${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Upload to App Store Connect using Transporter app"
echo "  2. Or use: xcrun altool --upload-app -f ios/App/build/$IPA_NAME -t ios"
echo ""
