---
forum_url: https://discourse.joplinapp.org/t/50955
---

# Your notes and AI: privacy first

AI can be useful for summarising, rewriting and asking questions about your notes. But your notes are private, so you should always know where your data is going.

**Joplin does not send your notes to an AI service by default.** AI features are disabled by default, and you have to explicitly enable them and choose an AI provider. [Learn more about AI Chat](https://joplinapp.org/help/apps/ai_chat).

## Keep your notes on your own device

You can connect Joplin to a local AI model, such as Ollama or LM Studio. In this case, your notes stay within your own device or private network and are not sent to an external service.

Joplin also blocks remote AI providers by default, as an additional safeguard.

## You control what AI can access

Joplin lets you choose **which tools are available to AI**. This applies both to AI Chat and to the Model Context Protocol (MCP) integration.

For example, you can allow an AI assistant to search your notes without giving it permission to modify them. You can enable or disable individual tools depending on what you are comfortable with.

This means that connecting an AI service to Joplin does not automatically give it unrestricted access to your data or to all of Joplin's capabilities. [Learn more about MCP](https://joplinapp.org/help/apps/ai_mcp).

## If you use a cloud AI provider

You can connect Joplin to cloud AI services such as Joplin Cloud AI, OpenAI or Anthropic. When you do, the relevant data is sent to the provider you have selected.

For AI Chat, Joplin only sends the note content required for your request — such as the currently open note or selected text — rather than automatically sending your entire notebook. [Learn more about the AI Chat panel](https://joplinapp.org/help/apps/ai_chat_panel).

## You are in control

Joplin's approach is simple: **AI should be opt-in, transparent and configurable.**

You choose whether to use AI, which provider to use, whether to use a local or remote model, and which tools that AI is allowed to access.

If you want maximum privacy, use a local AI model and only enable the tools you actually need.
