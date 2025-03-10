# Screen reader accessibility

This document includes tips for using Joplin from either:
- a keyboard-only device (desktop)
- a screen reader (desktop and/or mobile)

## Navigating the desktop app

Joplin's UI is divided into regions. In addition to the standard screen reader "jump to" shortcuts, Joplin includes its own shortcuts for navigating to these regions.

See items in the "Go"/"Focus" section of the menubar for keyboard shortcuts to move focus directly to some of these regions.

### Accessibility regions

Joplin's main window is divided into three main regions:
1. **Navigation 1**: The sidebar.
2. **Navigation 2**: The notes list.
3. **Main content**: The editor and viewer.

Within the **main content**, Joplin has:
1. **Editable**: A note title input.
2. Two toolbars.
3. **Editable**: A note editor.
4. **Frame**: A note viewer.

Screen readers usually support jumping between these different regions. Here's the relevant documentation for some of the more popular screen readers:
- [Orca](https://help.gnome.org/users/orca/stable/howto_structural_navigation.html.en) (Linux screen reader)
- [NVDA](https://download.nvaccess.org/documentation/en/userGuide.html#SingleLetterNavigation)
- [Voice Over](https://www.apple.com/voiceover/info/guide/_1134.html#mchlp2719)

### Finding notes, tags, and notebooks

It can sometimes be difficult to find a tag/note/notebook using Joplin's navigation sidebars. In these cases, the ["Go to Anything" dialog](https://github.com/laurent22/joplin/blob/dev/readme/apps/search.md#goto-anything) can simplify accessing an item.

It's also possible to find notes using the search in the sidebar. By default, pressing <kbd>F6</kbd> moves focus to this search entry.

### Toggling tab-key navigation

By default, pressing <kbd>tab</kbd> indents, rather than moves focus. This can be changed by toggling "Tab moves focus" from the "View" menu. By default, this can also be toggled by pressing <kbd>ctrl</kbd>-<kbd>m</kbd>.

## Navigating the mobile app

The mobile app is divided into several screens. These are the main ones:
1. A collapsed-by-default sidebar.
2. A notes list screen.
3. A note viewer.
4. A note editor.
5. A configuration screen.

By default, the sidebar is hidden and the notes list is visible. The configuration screen can be opened using a button in the sidebar.

### Creating a new note

An "add new" button is located near the end of the focus order in these cases:
1. The sidebar is expanded, or
2. The notes list screen is visible for an editable notebook.

Clicking "add new" opens a menu with "new note" and "new to-do" menu items. These items are be located just before the toggle in the focus order.

See [to-dos](https://github.com/laurent22/joplin/blob/dev/readme/apps/to-dos.md) for information about how notes and to-dos are different.

