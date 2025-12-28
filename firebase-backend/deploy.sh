#!/bin/bash

# Firebase Backend Deployment Script
# This script will deploy your Firebase backend

set -e  # Exit on error

echo "🚀 Firebase Backend Deployment"
echo "=============================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed"
    echo "   Install with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if logged in
echo "📋 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  Not logged in to Firebase"
    echo "   Please run: firebase login"
    exit 1
fi

echo "✅ Logged in to Firebase"
echo ""

# Navigate to firebase-backend directory
cd "$(dirname "$0")"

# Check current project
echo "📋 Current Firebase project:"
firebase use
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd functions
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
cd ..
echo ""

# Deploy
echo "🚀 Deploying to Firebase..."
echo ""
echo "This will deploy:"
echo "  - Cloud Functions"
echo "  - Firestore Rules"
echo "  - Storage Rules"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🔄 Deploying..."
firebase deploy --only functions,firestore:rules,storage:rules

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy the Function URL from above"
echo "   2. Update your .env file:"
echo "      VITE_API_URL=https://us-central1-channel-partner-54334.cloudfunctions.net/api"
echo "   3. Restart your frontend dev server"
echo ""

