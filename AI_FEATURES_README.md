# 🦄 AI-Powered Joplin - Your Intelligent Note-Taking Companion

Welcome to the AI-enhanced version of Joplin! This implementation transforms your note-taking experience with powerful AI capabilities powered by OpenRouter.

## 🌟 Features

### 1. **AI Writing Assistant**
- **Improve Writing**: Enhance clarity, style, and readability of your text
- **Fix Grammar**: Automatically correct grammar, spelling, and punctuation errors
- **Expand Text**: Add more details and context to brief notes
- **Make Shorter**: Condense lengthy text while preserving key information

### 2. **Content Generation**
- **Summarize**: Generate concise summaries of long notes or selected text
- **Continue Writing**: Let AI continue your thoughts and complete your ideas
- **Smart Tag Suggestions**: Automatically generate relevant tags for your notes

### 3. **AI Chat Assistant**
- **Ask Questions**: Get answers about your note content
- **Interactive Chat**: Have a conversation with AI about your notes
- **Context-Aware**: AI understands your entire note when answering questions

### 4. **Translation**
- Translate selected text to any language
- Maintain original tone and meaning

### 5. **Custom Instructions**
- Apply custom AI prompts to your text
- Flexibility to use AI however you need

## 🚀 Getting Started

### Step 1: Get an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `sk-or-...`)

### Step 2: Configure Joplin

1. Open Joplin
2. Go to **Settings** > **AI**
3. Enable **"Enable AI features"**
4. Paste your OpenRouter API key in **"OpenRouter API Key"**
5. (Optional) Change the default model if desired
6. Click **Apply**

### Step 3: Start Using AI Features!

#### In the Note Editor:

**Method 1: AI Assistant Panel**
- Click the AI Assistant button (🤖) in the toolbar
- Use quick action buttons for common tasks
- Or chat with AI about your note

**Method 2: Context Menu**
- Select text in your note
- Right-click to open context menu
- Choose an AI action from the menu

**Method 3: Commands**
- Use Command Palette (Ctrl/Cmd + Shift + P)
- Type "AI:" to see all available AI commands
- Select the command you want to use

## 📋 AI Commands Reference

| Command | Description | Requires Selection |
|---------|-------------|-------------------|
| **AI: Summarize** | Create a summary of text | No (uses whole note if nothing selected) |
| **AI: Improve Writing** | Enhance writing quality | Yes |
| **AI: Fix Grammar** | Correct grammar and spelling | Yes |
| **AI: Translate** | Translate to another language | Yes |
| **AI: Expand Text** | Add more details | Yes |
| **AI: Make Shorter** | Condense text | Yes |
| **AI: Continue Writing** | Continue from where you left off | No |
| **AI: Generate Tags** | Suggest relevant tags | No (analyzes whole note) |
| **AI: Ask Question** | Ask about note content | No (uses whole note as context) |
| **AI: Custom Instruction** | Apply custom prompt | Yes/No (depends on instruction) |

## 🎯 Use Cases

### Academic Writing
- Summarize research papers
- Improve essay clarity
- Fix grammar in drafts
- Generate relevant tags for organization

### Professional Notes
- Summarize meeting notes
- Improve email drafts
- Translate communications
- Generate action items

### Creative Writing
- Continue story ideas
- Expand on brief outlines
- Improve prose quality
- Fix grammar while preserving voice

### Personal Notes
- Summarize long journal entries
- Organize thoughts with AI tags
- Ask questions about past notes
- Improve clarity of ideas

## ⚙️ Configuration Options

### Settings > AI

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable AI features** | Master switch for all AI functionality | `false` |
| **OpenRouter API Key** | Your OpenRouter API key (required) | - |
| **Default AI Model** | Model to use for AI operations | `openai/gpt-4o-mini` |
| **Auto-suggest tags** | Automatically suggest tags when editing | `false` |

### Recommended Models

**Fast & Affordable:**
- `openai/gpt-4o-mini` - Great balance of speed and quality (default)
- `google/gemini-flash-1.5-8b` - Very fast and cheap

**High Quality:**
- `anthropic/claude-3.5-sonnet` - Best for writing tasks
- `openai/gpt-4o` - Excellent all-around performance
- `google/gemini-pro-1.5` - Great for long context

**Specialized:**
- `meta-llama/llama-3.3-70b` - Open source, good quality
- `mistralai/mistral-large` - European alternative

See [OpenRouter Models](https://openrouter.ai/models) for the full list with pricing.

## 💰 Pricing

OpenRouter uses a pay-as-you-go model. Costs vary by model:

- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Gemini Flash 8B**: ~$0.04 per 1M input tokens, ~$0.15 per 1M output tokens

**Typical usage costs:**
- Summarizing a 1000-word note: ~$0.001-0.01 (less than a penny!)
- 100 AI operations per month: ~$0.50-2.00
- Heavy usage (1000 operations): ~$5-20

💡 **Tip**: Start with GPT-4o-mini for the best value!

## 🔒 Privacy & Security

- **Your API key is stored securely** in Joplin's encrypted settings
- **Your notes are sent to OpenRouter** when using AI features
- OpenRouter forwards requests to the selected AI provider (OpenAI, Anthropic, etc.)
- Check [OpenRouter Privacy Policy](https://openrouter.ai/privacy) for details
- Your notes are **not stored** by OpenRouter (they only proxy requests)

### Privacy Tips:
1. Don't use AI features on highly sensitive/confidential notes
2. Consider using local/self-hosted AI models if privacy is critical
3. Review OpenRouter's data handling policies
4. You can disable AI features anytime in Settings

## 🛠️ Technical Architecture

### Components

```
packages/lib/services/ai/
├── OpenRouterService.ts    # Core API integration
├── AiService.ts            # Main service layer
├── aiCommands.ts           # Command definitions
└── index.ts                # Exports

packages/app-desktop/gui/AiAssistant/
├── AiAssistantPanel.tsx    # Sidebar panel UI
├── AiToolbarButton.tsx     # Toolbar integration
├── AiContextMenu.tsx       # Context menu integration
└── index.ts                # Exports
```

### Settings

Settings are defined in `packages/lib/models/settings/builtInMetadata.ts`:
- `ai.enabled` - Master toggle
- `ai.openRouter.apiKey` - API key (secure)
- `ai.openRouter.model` - Default model
- `ai.autoSuggestTags` - Auto-tag feature

## 🐛 Troubleshooting

### "AI features are disabled"
→ Enable AI in Settings > AI

### "OpenRouter API key not set"
→ Add your API key in Settings > AI > OpenRouter API Key

### "API Error: 401 Unauthorized"
→ Check that your API key is correct and active

### "API Error: 429 Rate Limited"
→ You've exceeded your rate limit. Wait a moment or check your OpenRouter account

### "No text to process"
→ Select some text or make sure your note has content

### AI responses are slow
→ Try using a faster model like `openai/gpt-4o-mini` or `google/gemini-flash-1.5-8b`

### AI responses are poor quality
→ Try a more powerful model like `anthropic/claude-3.5-sonnet` or `openai/gpt-4o`

## 🔮 Future Enhancements

Potential features for future development:
- 📝 AI-powered note templates
- 🔍 Semantic search across notes
- 🤖 Custom AI assistants for specific note types
- 📊 AI-generated summaries for notebooks
- 🎨 AI image generation for notes
- 🔗 Smart linking suggestions between notes
- 📅 AI meeting note templates and action item extraction
- 🌐 Offline AI with local models (Ollama integration)

## 📚 Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Joplin Documentation](https://joplinapp.org/help/)
- [Model Comparison](https://openrouter.ai/models)
- [API Pricing](https://openrouter.ai/models#pricing)

## 🤝 Contributing

This is a community enhancement to Joplin! Feel free to:
- Report bugs
- Suggest features
- Submit improvements
- Share your AI prompts and use cases

## 📄 License

This enhancement follows Joplin's original license (MIT).

---

**Made with ❤️ for the Joplin community**

🦄 Now you have an AI-powered unicorn of a note-taking app! 🦄
