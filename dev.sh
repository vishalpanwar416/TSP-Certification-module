#!/bin/bash
# Development server startup script
# This bypasses the conflicting 'run' command issue

echo "🚀 Starting development servers..."

# Start Firebase emulator in background
echo "📦 Starting Firebase Functions emulator..."
cd firebase-backend
firebase emulators:start --only functions > /tmp/firebase-emulator.log 2>&1 &
FIREBASE_PID=$!
echo "✅ Firebase emulator started (PID: $FIREBASE_PID)"
cd ..

# Wait a moment for emulator to start
sleep 3

# Start Vite dev server
echo "⚡ Starting Vite dev server..."
/opt/homebrew/bin/npm run dev
