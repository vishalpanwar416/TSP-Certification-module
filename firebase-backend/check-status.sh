#!/bin/bash

# Check Firebase project status

echo "🔍 Checking Firebase Project Status"
echo "===================================="
echo ""

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase"
    echo "   Run: firebase login"
    exit 1
fi

echo "✅ Logged in to Firebase"
echo ""

# Show current project
echo "📋 Current Project:"
firebase use
echo ""

# Check if services are enabled
echo "🔍 Checking enabled services..."
echo ""

# Check Firestore
echo -n "Firestore: "
if firebase firestore:databases:list &> /dev/null; then
    echo "✅ Enabled"
else
    echo "❌ Not enabled"
    echo "   Enable at: https://console.firebase.google.com/project/channel-partner-54334/firestore"
fi

# Check Storage
echo -n "Storage: "
if firebase storage:rules:get &> /dev/null 2>&1; then
    echo "✅ Enabled"
else
    echo "❌ Not enabled"
    echo "   Enable at: https://console.firebase.google.com/project/channel-partner-54334/storage"
fi

# Check Functions (requires Blaze plan)
echo -n "Cloud Functions: "
if firebase functions:list &> /dev/null; then
    echo "✅ Enabled (Blaze plan active)"
else
    echo "❌ Requires Blaze plan"
    echo "   Upgrade at: https://console.firebase.google.com/project/channel-partner-54334/usage/details"
fi

echo ""
echo "📝 Next Steps:"
echo "   1. Upgrade to Blaze plan (required for Functions)"
echo "   2. Enable Storage (if not enabled)"
echo "   3. Enable Firestore (if not enabled)"
echo "   4. Run: firebase deploy --only functions,firestore:rules,storage:rules"
echo ""

