# Whiteboard support

Whiteboards, also known as "canvas", allow organising notes spatially on an infinite zoomable surface. Instead of editing prose top-to-bottom, you arrange text cards, images, PDFs, links and references to other notes anywhere on a 2D surface, and connect them with labelled arrows.

Whiteboards are stored as ordinary Joplin notes — the data lives inside the note body as a fenced code block in the open [JSONCanvas](https://jsoncanvas.org/) format — so they sync, search, share, back up and convert just like any other note.

## Availability

Whiteboard editing is available on the desktop app only. Mobile read/edit support is planned as a follow-up.

## Creating a whiteboard

To create a new whiteboard, open **Tools → Create whiteboard**.

## The editor

A whiteboard note opens directly in the editor. The view supports panning (click-drag on empty space, or scroll), zooming (Ctrl/Cmd + scroll), and includes a minimap and zoom controls in the corner.

### Adding cards

- **+ Text** (top-right action panel) — adds a new text card near the centre of the visible viewport. Double-click the card or press **Enter** when it's focused to edit; the body supports Markdown, including headings, lists, code blocks, and checkboxes.
- **Drag and drop from Joplin** — drag a note from the note list, or an attachment, onto the whiteboard to create a card linking to it.
- **Tools → Add note to whiteboard** — opens the note picker and adds a card linking to the chosen Joplin note. The card shows the note's title and a live preview of its body, with working checkboxes.

### Connecting cards

Hover over a card to reveal connection handles on its four sides. Click and drag from a handle to another card to create an edge.

When one or more edges are selected, an action panel at the bottom of the whiteboard lets you:

- Change the arrowhead direction: none (`—`), forward (`→`), backward (`←`), or bidirectional (`↔`).
- Swap source and target with **Flip**.
- Add a label that's shown along the edge.

### Promoting a text card to a real note

If a text card has grown into something that deserves its own note, select it and click **Promote to note**. This creates a new Joplin note in the same notebook as the whiteboard, with the card's text as the body and its first non-empty line as the title, then replaces the text card on the whiteboard with a link to the new note.

### Switching to the Markdown view

The "eye" icon in the note toolbar toggles the note between the whiteboard editor and the standard Markdown editor. In Markdown view, you can read and hand-edit the underlying JSONCanvas data, add prose before or after the fence, etc. Editing the JSON directly is supported but advanced — invalid JSON will prevent the whiteboard from loading until it's repaired.

## Accessibility

The Whiteboard is an inherently visual-spatial tool, but a few affordances make it usable beyond mouse-only interaction:

- **Eye toggle as a text fallback.** The "eye" icon in the toolbar switches the note to the Markdown editor, where the whiteboard is shown as its underlying JSONCanvas text. Every text card's content, every link target, and every edge label is plain text in that view, so screen-reader users (and full-text search, and external tools) can read and edit a whiteboard's content without using the visual editor at all.
- **Keyboard navigation.** Cards are reachable by Tab. Press **Enter** or **F2** on a focused text card to enter edit mode, **Esc** to cancel, and **Cmd/Ctrl + Enter** to commit the edit.
- **Toolbar buttons** in the action panels expose accessible labels for screen readers and voice-control users.

## How are whiteboards stored?

A whiteboard note is a regular Markdown note whose body contains a fenced code block tagged `jsoncanvas`:

````
```jsoncanvas
{
  "nodes": [ ... ],
  "edges": [ ... ]
}
```
````

The format is [JSONCanvas 1.0](https://jsoncanvas.org/), an open specification for canvas. This means a whiteboard you create in Joplin can be opened (and round-tripped) in any other JSONCanvas-compatible editor, and vice versa. Group nodes and other JSONCanvas features the desktop editor doesn't render are preserved on save so they survive a round trip.

Because the whiteboard is part of the note body, all of Joplin's existing infrastructure works on whiteboards without modification: synchronisation, end-to-end encryption, full-text search across card text, sharing via Joplin Cloud, conflict resolution, revision history, and export/import.
