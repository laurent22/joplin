# Drawing tool

Joplin supports inserting and editing drawings. On mobile, this is built in. On desktop, this is supported through the [Freehand Drawing plugin](https://joplinapp.org/plugins/plugin/io.github.personalizedrefrigerator.js-draw/).

## Core features

- Inserting and manipulating drawings, images, and plain text.
- Drawing with a stylus and/or touchscreen.
- Embedding multiple drawings in the same note.
- A [very large zoom range](#large-zoom-range) 

## On mobile

### Adding a drawing

<figure>
  <img src="/images/draw/add-new-image.svg" alt=""/>
  <figcaption>The note actions menu includes a "Draw picture" option.</figcaption>
</figure>

Clicking "Draw picture" adds a new drawing to the note. When Joplin's note viewer is open, drawings are added to the end of the note. In editing mode, drawings are added at the cursor.

### Editing an existing drawing

Existing drawings can be opened and edited from the note viewer.

<figure>
  <img src="/images/draw/edit-from-viewer.svg" alt=""/>
  <figcaption>An existing drawing can be edited by: 1. tapping on the drawing, then 2. pressing the "edit" button.</figcaption>
</figure>

## On desktop

With the [Freehand Drawing plugin](https://joplinapp.org/plugins/plugin/io.github.personalizedrefrigerator.js-draw/), the UI for adding and editing drawings on desktop is slightly different. 

Here, the "insert drawing" button is part of the main editor toolbar:

<figure>
  <img src="/images/draw/desktop-create-new-drawing.png" alt=""/>
  <figcaption>Clicking on the pen icon in the toolbar opens a full-screen drawing dialog. As on mobile, clicking "Exit" gives the option to save or discard changes.</figcaption>
</figure>

Double-click on an existing drawing to edit it:

<figure>
  <video src="/images/draw/edit-existing-drawing-on-desktop.mp4" alt="" controls="controls" width="90%"></video>
  <figcaption>In the Rich Text editor, double-clicking allows editing an existing drawing. This also works in the markdown viewer.</figcaption>
</figure>

For more ways to edit existing drawings on desktop, see the [Freehand Drawing plugin's FAQ](https://joplinapp.org/plugins/plugin/io.github.personalizedrefrigerator.js-draw/#faq).


## The editor

### Save, undo, and exit

<figure>
  <img src="/images/draw/editor-toolbar-top.svg" alt=""/>
  <figcaption>The top of the editor includes options for saving, closing, and undo/redo.</figcaption>
</figure>

Actions for managing changes are at the top of the screen:
- **Close**: Hides the editor. If there are unsaved changes, this gives the option to save or discard them.
- **Save**: Save changes to the drawing, *without* closing the editor.
- **Undo**: Reverts the last change to the drawing.
- **Redo**: Redoes an undone change.

:::note

Long-pressing on a toolbar button shows a brief description. For example, long-pressing on the undo button shows "undo":

![](/images/draw/long-press-edit.svg)

:::

### Tools

Clicking on an unselected tool switches to that tool. Clicking an already-selected toolbar button allows changing that tool's settings:

<figure>
  <img src="/images/draw/show-pen-menu.svg" alt=""/>
  <figcaption>Clicking on the pen tool shows a menu that includes color options, different pen styles, shapes, and autocorrect.</figcaption>
</figure>

Most tool menus have a help button (<img alt="help" src="/images/draw/help-icon.png" width="30"/>) that shows additional information about the different available settings.

## How are drawings saved?

Drawings are saved as Joplin resources using the [SVG image format](https://en.wikipedia.org/wiki/SVG).

This means that it should be possible to view and/or edit and view drawings in other apps that support SVG:

<figure>
  <img src="/images/draw/drawing-opened-in-other-apps.png" alt=""/>
  <figcaption>A drawing is shown in Joplin's note viewer, Inkscape, and GNOME Image Viewer. Inkscape doesn't support all features of SVG used by Joplin — only solid-color lines are visible.</figcaption>
</figure>

## Other features

### Large zoom range

The drawing tool has a very large zoom range by default. Among other things, this can be used to provide additional details or clarification to notes.

<video src="/images/draw/infinite-zoom-demo.mp4" controls="controls" width="90%"></video>


### Locking rotation and disabling touch drawing

The "hand" tool's settings include:
- **Rotation locking**: By default, touch gestures can rotate the screen. Rotation locking prevents the screen from rotating.
- **Touchscreen panning** prevents the touchscreen from drawing. Instead, all touch gestures move the screen. This is particularly useful on tablets with a stylus.

<figure>
  <img alt="" src="/images/draw/lock-rotation.png" width="300"/>
  <figcaption>The hand tool menu includes "touchscreen panning" and "lock rotation" options, in addition to buttons to change the zoom level.</figcaption>
</figure>

### Picking a color from the screen

Color pickers include a "pick color from screen" tool:

<figure>
  <img alt="" src="/images/draw/pick-color-from-screen.svg"/>
  <figcaption>A "pick color from screen" is located to the right of the color picker for the pen tool.</figcaption>
</figure>

This tool allows setting the current pen, text, or selection color to a color displayed on the screen.

:::note

It's also possible to **click and drag** with this tool. While doing this, the interior of the color dropper shows the color below the cursor:

<img alt="" src="/images/draw/color-under-cursor.png" width="60%"/>

:::

### Changing the color of selected items

After selecting content with the selection tool, the selection tool menu allows duplicating, deleting, and changing the color of the selection:

<figure>
  <img alt="" src="/images/draw/average-selection-color.png" width="60%"/>
  <figcaption>The selection tool's menu includes actions that allow duplicating, deleting, and reformatting the selection.</figcaption>
</figure>

### Keyboard shortcuts

On desktop and mobile devices with keyboards, the following keyboard shortcuts are available:

- <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, ...: Change the selected tool.
- <kbd>space</kbd>: Open the configuration menu for the selected tool.
- <kbd>ctrl</kbd>-<kbd>z</kbd>, <kbd>ctrl</kbd>-<kbd>shift</kbd>-<kbd>z</kbd>: Undo and redo.
- Changing the selection
  - <kbd>ctrl</kbd>-<kbd>d</kbd>: Duplicate selected items.
  - <kbd>end</kbd>: Move selection to back.
  - <kbd>i</kbd>, <kbd>o</kbd>, <kbd>shift</kbd>-<kbd>i</kbd>, <kbd>shift</kbd>-<kbd>o</kbd>: Stretch the selection vertically or horizontally.
  - <kbd>r</kbd>, <kbd>shift</kbd>-<kbd>r</kbd>: Rotate the selection.
  - <kbd>ctrl</kbd>-<kbd>a</kbd>: Select all.
  - <kbd>shift</kbd>-click and drag: Expand the selection.
- Changing the pen style
  - <kbd>alt</kbd>-<kbd>1</kbd>, <kbd>alt</kbd>-<kbd>2</kbd>, ...: If a pen tool is selected, change the style of the selected pen.
  - <kbd>+</kbd>, <kbd>-</kbd>: Increase or decrease the size of the selected pen.
- Moving around the image
  - <kbd>ctrl</kbd>-<kbd>f</kbd>: Find text and images.
  - <kbd>w</kbd>: Zoom in.
  - <kbd>s</kbd>: Zoom out.
  - Arrow keys: Move left/right/up/down.
  - <kbd>r</kbd>, <kbd>shift</kbd>-<kbd>r</kbd>: Rotate the viewport.
- Drawing
  - <kbd>shift</kbd>-drag: Plane lock
  - <kbd>ctrl</kbd>-drag: Snap to grid
- <kbd>ctrl</kbd>-<kbd>s</kbd>: Save
- <kbd>alt</kbd>-<kbd>q</kbd>: Close (Desktop only)

:::note

On MacOS and iOS, in most cases, both <kbd>ctrl</kbd> and the command key will trigger the above shortcuts.

:::

### Changing the part of a drawing shown in the note viewer

It's possible to change which part of a drawing is visible in the note viewer using the selection and page menus:

<figure>
  <img alt="" src="/images/draw/change-visible-region.png"/>
  <figcaption>Changing which part of the image will be shown in the image can be done by 1) selecting part of the image, 2) opening the selection menu and clicking "resize image to selection".</figcaption>
</figure>

When opening the note viewer again, the image will be cropped to the region selected above.

To un-crop an image, use "Auto-resize" in the "page" menu:

<figure>
  <img alt="" src="/images/draw/restore-auto-resize.png"/>
  <figcaption>Checking and un-checking "Auto-resize" in the page menu is another way to give a drawing a specific size. When checked, the full drawing will be shown in Joplin's note viewer.</figcaption>
</figure>
