#!/bin/bash

# Exit on error
set -e

# 1. Build Main App
echo "Building Main App..."
rm -f dist/index.html # Force remove to avoid permission issues
# Ensure dist exists
mkdir -p dist

# Use esbuild
./node_modules/.bin/esbuild index.tsx --bundle --outfile=dist/bundle.js --loader:.tsx=tsx --loader:.mov=file --loader:.mp4=file --jsx=automatic --define:process.env.NODE_ENV='"production"' --define:process.env.API_KEY='"AIzaSyD0JEm3fqse7TQZ1ri2UWMmdtJigyX3fpo"' --define:import.meta.env.VITE_BETA_BUILD='"'$VITE_BETA_BUILD'"'

# 2. Process HTML
echo "Processing HTML..."
sed -e 's|dist/bundle\.js|./bundle.js?v='$(date +%s)'|g' -e '/<link rel="stylesheet" href="\/index\.css">/d' index.html > dist/index.html

# 3. Copy Assets
echo "Copying Assets..."
mkdir -p dist/sounds
cp -r sounds/* dist/sounds/ 2>/dev/null || true
mkdir -p dist/visuals
cp -r visuals/* dist/visuals/ 2>/dev/null || true

# 4. Build Pitch Perfector 2
echo "Building Pitch Perfector 2..."
cd pitch-perfector2
npm install
npm run build
cd ..

# 5. Copy Pitch Perfector 2 to dist
echo "Copying Pitch Perfector 2 to dist..."
mkdir -p dist/pitch-perfector2
cp -r pitch-perfector2/dist/* dist/pitch-perfector2/

echo "Build Complete!"
