#!/bin/bash
# Setup script for Beon CLI

set -e

echo "🚀 Setting up Beon CLI..."

# Install dependencies
echo "📦 Installing dependencies..."
cd /home/avrodotter/dev/beon-avro
pnpm install

# Build
echo "🔨 Building CLI..."
cd apps/notion-cli
pnpm build

# Make executable
chmod +x dist/cli.js

# Link globally (optional)
if command -v npm &> /dev/null; then
  echo "🔗 Installing globally..."
  npm link 2>/dev/null || echo "ℹ️  Run 'npm link' manually if needed"
fi

echo ""
echo "✅ Beon CLI is ready!"
echo ""
echo "Usage:"
echo "  Interactive mode:  beon"
echo "  One-off command:   beon \"I did 40 pushups\""
echo ""
echo "Don't forget to add GROQ_API_KEY to your .env file!"
echo ""
