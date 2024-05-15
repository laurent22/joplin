# Mobile: Drawing

In addition to text-based notes, the mobile app supports inserting and editing vector drawings.

## Core features

- Inserting and manipulating freehand drawings, images, and plain text.
- Drawing with a stylus and/or touchscreen.
- Embedding multiple drawings in the same note.
- [Very large zoom range](#infinite-zoom)

## Adding a drawing

![screenshot: Note actions menu is open, an arrow points to "Draw picture"](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/add-new-image.svg)

Drawings can be added using the "draw picture" option in the note actions menu. When Joplin is in viewing mode, drawings are added to the end of the note. In editing mode, drawings are added at the cursor.

## Editing an existing drawing

Existing drawings can be opened and edited from the note viewer.

![screenshot: Steps to edit a drawing: 1. Tap on the drawing, 2. Press the "edit" button](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/edit-from-viewer.svg)

On desktop, drawings can be edited using the [Freehand Drawing plugin](https://joplinapp.org/plugins/plugin/io.github.personalizedrefrigerator.js-draw/) and [some external editors](#how-are-drawings-saved).

## The editor

### Save, undo, and exit

![screenshot: Close, redo, undo, and save buttons are all labeled at the top of the screen](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/editor-toolbar-top.svg)

Actions for managing changes are at the top of the screen:
- **Close**: Hides the editor. If there are unsaved changes, this gives the option to save or discard them.
- **Save**: Save changes to the drawing in Joplin, *without* closing the editor.
- **Undo**: Reverts the last change to the drawing.
- **Redo**: Un-reverts the last change.

:::note

It's possible to show the label for most buttons by long-pressing:
![screenshot: Undo button labeled with "Long-press"](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/long-press-edit.svg)

:::

### Tools

Tools can be changed by clicking on them in the toolbar. Clicking an already-selected toolbar button allows changing that tool's settings.

![screenshot: First: Arrow points to the first pen tool. Second: A pop-up menu is shown with options including color, thickness, pen type, ...](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/show-pen-menu.svg)

To see more information about a tool's setting, click the help button (<img alt="screenshot: help" src="../_resources/69a1cfe00b0c375626e2e3a2c085855e.png" width="30"/>).



## How are drawings saved?

Drawings are saved as Joplin resources. To allow drawings to be edited in other applications, Joplin uses the [SVG image format](https://en.wikipedia.org/wiki/SVG).

This means that it should be possible to edit and view most drawings in other apps that support SVG:

![screenshot: Drawing open in other apps](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/drawing-opened-in-other-apps.png)


## Other features

### Infinite zoom


[infinite-zoom-demo.mp4](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/infinite-zoom-demo.mp4)

### Locking rotation and disabling touch drawing

The "hand" tool's settings include:
- **Rotation locking**: By default, touch gestures can rotate the screen. Rotation locking prevents the screen from rotating.
- **Touchscreen panning** prevents the touchscreen from drawing. Instead, all touch gestures move the screen. This is particularly useful on tablets with a stylus.

<img alt="screenshot: Hand tool menu: Shows 'touchscreen panning' and 'lock rotation' options." src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/lock-rotation.png" width="300"/>

### Picking a color from the screen

Color pickers include a "pick color from screen" tool:
![screenshot: Pick color from screen tool highlighted](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/pick-color-from-screen.svg)
This tool allows setting the current pen, text, or selection color to a color displayed on the screen.

### Changing the color of selected items

After selecting content with the selection tool, the selection tool menu allows duplicating, deleting, and changing the color of the selection:

![screenshot: Format selection includes ability to change the color of selected content](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/draw/average-selection-color.svg)

## See also

- [js-draw — the library used](https://github.com/personalizedrefrigerator/js-draw)