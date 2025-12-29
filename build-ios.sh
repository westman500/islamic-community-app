#!/bin/bash

# iOS Build Script for Mac
# Run this script on your Mac after transferring the project

echo "🚀 Masjid iOS Build Script"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script must be run on macOS${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Check CocoaPods
if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}⚠️  CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
fi
echo -e "${GREEN}✓ CocoaPods $(pod --version)${NC}"

# Check Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode not found. Please install from App Store${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Xcode $(xcodebuild -version | head -n 1)${NC}"

echo -e "\n${YELLOW}Step 2: Installing Node dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo -e "\n${YELLOW}Step 3: Installing iOS Pods...${NC}"
cd ios/App
if [ -f "Podfile" ]; then
    pod install
    echo -e "${GREEN}✓ Pods installed${NC}"
else
    echo -e "${RED}❌ Podfile not found${NC}"
    exit 1
fi
cd ../..

echo -e "\n${YELLOW}Step 4: Verifying build files...${NC}"
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠️  dist folder not found. Running build...${NC}"
    npm run build
fi
echo -e "${GREEN}✓ Build files ready${NC}"

echo -e "\n${YELLOW}Step 5: Opening Xcode...${NC}"
open ios/App/App.xcworkspace

echo -e "\n${GREEN}================================"
echo "✅ Project is ready!"
echo "================================${NC}"
echo ""
echo "Next steps in Xcode:"
echo "1. Select 'Any iOS Device (arm64)' as build target"
echo "2. Go to Product → Archive"
echo "3. Wait for archive to complete"
echo "4. Click 'Distribute App'"
echo "5. Choose distribution method (Ad Hoc or App Store)"
echo "6. Follow the wizard to create IPA"
echo ""
echo "Or run: ./build-ipa-command-line.sh"
echo ""
