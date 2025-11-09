# 🚀 Lumina Notes - Quick Start Guide

## Getting Started in 3 Steps

### 1. Install Dependencies

```bash
cd /home/user/joplin
npm install
```

Or if you use yarn (recommended):

```bash
yarn install
```

### 2. Build the Application

```bash
# Build all packages
npm run buildParallel

# Or build sequentially (more stable)
npm run buildSequential
```

### 3. Run Lumina Notes

```bash
cd packages/app-desktop
npm start
```

---

## What Just Happened?

When you launch Lumina Notes for the first time:

1. **🌟 Beautiful Onboarding** - Interactive setup wizard
2. **🎨 Theme Selection** - Choose your preferred look
3. **🤖 AI Setup** - Connect your OpenRouter API key (optional)
4. **✨ Ready to Go** - Start creating AI-enhanced notes!

---

## Quick Tips

### Command Palette
- Press **Cmd/Ctrl + K** to open the command palette
- Type to search for any command
- See all AI features at your fingertips

### AI Features
- Select text → Right-click → AI options
- Click AI button in toolbar
- Use command palette for quick access

### Get OpenRouter API Key
1. Visit https://openrouter.ai
2. Sign up (free)
3. Create API key
4. Paste in Settings > AI

---

## Development Mode

### Watch Mode (Auto-rebuild on changes)

```bash
# In one terminal
cd /home/user/joplin
npm run watch

# In another terminal
cd /home/user/joplin/packages/app-desktop
npm start
```

### Debug Mode

```bash
cd /home/user/joplin/packages/app-desktop
npm start -- --log-level debug --open-dev-tools
```

---

## Troubleshooting

### "Module not found" errors
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run buildParallel
```

### TypeScript errors
```bash
# Run TypeScript compiler
npm run tsc
```

### Can't see AI features
1. Check Settings > AI > Enable AI features
2. Add OpenRouter API key
3. Restart application

### Command palette not working
- Make sure you're pressing **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux)
- Check that no other app is intercepting the shortcut

---

## Project Structure

```
joplin/
├── packages/
│   ├── app-desktop/          # Desktop app (Electron)
│   │   ├── gui/               # UI components
│   │   │   ├── AiAssistant/   # AI UI components
│   │   │   ├── LuminaTheme/   # Theme & palette
│   │   │   └── MainScreen.tsx # Main app screen
│   │   └── app.ts             # App initialization
│   │
│   ├── lib/                   # Shared library
│   │   ├── services/ai/       # AI services
│   │   └── models/            # Data models
│   │
│   └── default-plugins/       # Built-in plugins
│       └── ai-assistant/      # AI plugin
│
├── lumina.config.js           # Product configuration
├── LUMINA_NOTES_README.md     # Product docs
├── AI_FEATURES_README.md      # AI features guide
└── QUICK_START.md             # This file
```

---

## Configuration

### Settings Location

**Settings > AI**
- Enable AI features
- OpenRouter API key
- Default AI model
- Auto-suggest tags

### Theme Selection

**Settings > Appearance > Theme**
- Lumina Dark (default)
- Lumina Light
- Lumina Purple (AI-focused)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd/Ctrl + K** | Open command palette |
| **Cmd/Ctrl + N** | New note |
| **Cmd/Ctrl + ,** | Settings |
| **Cmd/Ctrl + F** | Search |

---

## What's Next?

### Explore AI Features
- Try summarizing a note
- Use "Improve Writing" on selected text
- Ask AI questions about your notes
- Generate tags automatically

### Customize
- Change theme
- Try different AI models
- Adjust settings

### Extend
- Install plugins
- Create custom AI prompts
- Contribute to the project

---

## Need Help?

- 📚 **Documentation**: See AI_FEATURES_README.md
- 🐛 **Issues**: GitHub Issues
- 💬 **Community**: Join discussions
- 📧 **Email**: hello@luminanotes.app

---

## Development Commands Reference

```bash
# Install dependencies
npm install

# Build everything
npm run buildParallel

# Watch mode (auto-rebuild)
npm run watch

# Run desktop app
cd packages/app-desktop && npm start

# Run tests
npm test

# Lint code
npm run linter

# Clean build
npm run clean
```

---

**Welcome to Lumina Notes! 🌟**

*Your intelligent note-taking journey starts here.*
