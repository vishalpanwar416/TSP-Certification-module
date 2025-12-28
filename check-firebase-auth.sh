#!/bin/bash

# Firebase Authentication Setup Checker
# This script helps verify Firebase authentication setup

echo "🔐 Firebase Authentication Setup Checker"
echo "=========================================="
echo ""

# Check if Firebase CLI is installed
echo "1. Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    echo "   ✅ Firebase CLI is installed"
    
    # Check if logged in
    if firebase projects:list &> /dev/null; then
        echo "   ✅ Firebase CLI is logged in"
        echo ""
        echo "   Your Firebase projects:"
        firebase projects:list | head -10
    else
        echo "   ⚠️  Firebase CLI is NOT logged in"
        echo "   Run: firebase login"
    fi
else
    echo "   ❌ Firebase CLI is not installed"
    echo "   Install with: npm install -g firebase-tools"
fi

echo ""
echo "2. Checking Firebase Configuration..."
if [ -f "src/config/firebase.js" ]; then
    echo "   ✅ firebase.js config file exists"
    
    # Check for required config values
    if grep -q "channel-partner-54334" src/config/firebase.js; then
        echo "   ✅ Project ID is configured"
    else
        echo "   ⚠️  Project ID might be incorrect"
    fi
else
    echo "   ❌ firebase.js config file not found"
fi

echo ""
echo "3. Next Steps:"
echo "   📋 Go to: https://console.firebase.google.com/project/channel-partner-54334/authentication/providers"
echo "   📋 Enable Google Sign-In provider"
echo "   📋 Add your support email"
echo "   📋 Save the changes"
echo ""
echo "4. After enabling, restart your dev server:"
echo "   npm run dev"
echo ""
echo "✅ Setup complete! Check the console for any errors."

