# AI chat panel

The AI chat panel is a sidebar attached to the note editor that lets you ask questions about the note you're working on, or ask for changes to be made to it. Replies appear in the panel; requested edits are applied directly to the note.

The panel is built on top of [AI chat](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_chat.md) — once that's set up, the panel works automatically.

## Opening the panel

There are three ways to open it:

- Click the chat icon in the note toolbar (top-right, above the editor).
- Press **Cmd+Shift+I** on macOS or **Ctrl+Alt+I** on Linux / Windows.
- Drag the right edge to resize, like any other Joplin panel.

The panel opens on the right of the editor. Its width and visibility are remembered across sessions.

The toolbar icon only appears when **Enable AI features** is on in Settings → AI.

## Asking about the open note

Type a question in the input box and press **Enter** (or click the send button). The model answers in the chat. For example:

- *"Summarise this in three bullet points."*
- *"What is this note saying about pricing?"*
- *"Are there any open questions I haven't answered?"*

The whole note is sent as context. If the note is too large for the model, you'll get a message asking you to select the relevant part instead.

## Asking for changes

You can also ask for edits to the note itself:

- *"Rewrite this paragraph in a more formal tone."*
- *"Add a heading above this and a one-line summary below it."*
- *"Fix the typos."*
- *"Add a short paragraph about how bees navigate."*

The model replies with a short message in the chat and applies the edits to the note. A small note under the assistant's reply tells you how many edits were applied. To undo, use **Ctrl/Cmd+Z** in the editor — chat-applied edits go on the normal editor undo stack.

If an edit can't be placed automatically (for example, the model tried to replace some text that you'd already changed), the chat tells you how many edits were skipped. You can ask the model to try again, or apply the change manually.

## Working on a selection

To scope a request to part of the note, select that part in the editor first, then send your message. Examples:

- Select a sentence and ask *"reword this"*.
- Select a code block and ask *"add comments"*.
- Select a heading and ask *"add a short intro paragraph below"*.

When you have a selection, the model only sees that selection — the rest of the note is not sent. This is the recommended way to work on long notes.

## Sticky conversations and switching notes

The conversation stays open as you move between notes. When you switch notes, a small marker appears in the chat (*"— now viewing: New Note —"*) so you can see the context shifted. The model is told about the *currently active* note on each new message, never a previous one.

This is useful when you're working through several related notes in a notebook — you can keep one conversation going across them.

To start fresh, click **Reset** in the panel header. Closing and reopening the panel keeps the conversation. Restarting Joplin clears it.

## Privacy

The panel only ever sends the **currently open note** (or your selection within it). It never reads or sends any other note.

The first time you send a message to a remote provider (anything other than Joplin Cloud AI), the panel shows a one-time notice telling you which provider your note is about to be sent to. Click *"Don't show again"* to dismiss it.

Encrypted notes can't be used with the panel — it tells you so when you try.

For more on what counts as remote and how to control that, see [AI chat → Local vs remote](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_chat.md).

## Limitations of the current version

- **Markdown editor only.** The rich text (WYSIWYG) editor doesn't support the chat panel's automatic edits yet.
- **No streaming.** Long replies appear all at once when the model has finished, not progressively.
- **No conversation history across restarts.** Conversations are kept while Joplin is running but are not saved to disk.
- **No cross-note context.** The chat doesn't pull in information from other notes. For semantic lookup across your vault, see [Semantic search](https://github.com/laurent22/joplin/blob/dev/readme/apps/ai_semantic_search.md).
- **Very large notes.** Notes that exceed the model's context window can't be sent in full; select the relevant section and ask about that.
