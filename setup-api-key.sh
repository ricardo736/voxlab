#!/bin/bash

# VoxLab - Google AI API Key Setup
# This script helps you configure the API key for vocal feedback generation

echo "🎤 VoxLab - Google AI API Key Setup"
echo "===================================="
echo ""
echo "To enable AI-powered vocal feedback, you need a Google AI API key."
echo ""
echo "Get your API key from: https://aistudio.google.com/app/apikey"
echo ""
echo "Options:"
echo "  1. Set API key for this session only (temporary)"
echo "  2. Add to shell profile (permanent - recommended)"
echo "  3. Skip (AI feedback will be disabled)"
echo ""
read -p "Choose an option (1-3): " choice

case $choice in
  1)
    read -p "Enter your Google AI API key: " api_key
    export API_KEY="$api_key"
    echo ""
    echo "✅ API key set for this session!"
    echo "   Run: npm start"
    ;;
  2)
    read -p "Enter your Google AI API key: " api_key
    
    # Detect shell
    if [ -n "$ZSH_VERSION" ]; then
      profile="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
      profile="$HOME/.bash_profile"
    else
      profile="$HOME/.profile"
    fi
    
    echo "" >> "$profile"
    echo "# VoxLab Google AI API Key" >> "$profile"
    echo "export API_KEY=\"$api_key\"" >> "$profile"
    
    echo ""
    echo "✅ API key added to $profile"
    echo "   Restart your terminal or run: source $profile"
    echo "   Then run: npm start"
    ;;
  3)
    echo ""
    echo "⚠️  AI feedback will be disabled."
    echo "   You can run this script again anytime to configure it."
    ;;
  *)
    echo "Invalid option. Exiting."
    exit 1
    ;;
esac

echo ""
echo "Done! 🎵"
