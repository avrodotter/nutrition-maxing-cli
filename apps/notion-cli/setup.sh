set -e

echo "🚀 Setting up Nutrition-maxing CLI..."

# Install dependencies (run from project root)
echo "📦 Installing dependencies..."
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
echo "✅ Nutrition-maxing CLI is ready!"
echo ""
echo "Usage:"
echo "  Interactive mode:  notion"
echo "  One-off command:   notion \"I ate 3 eggs and toast\""
echo ""
echo "Don't forget to set these environment variables in your .env file:"
echo "  - GROQ_API_KEY (from https://console.groq.com/)"
echo "  - NOTION_API_KEY (from https://www.notion.so/my-integrations)"
echo ""
