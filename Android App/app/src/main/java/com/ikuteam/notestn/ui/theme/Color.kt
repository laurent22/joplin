package com.ikuteam.notestn.ui.theme

import androidx.compose.ui.graphics.Color

// Brand yellow palette — same values in light/dark. Mirrors Mac's AppColors.swift
// and the --color-* custom properties in Mac/EditorBundle/build.mjs.
// Vivid and Dark used to be two shades (#F9B524 / #DEAA33); both are now the single
// brand yellow #F9B524. The two names are kept because they mark different roles.
val NotesYellowVivid = Color(0xFFF9B524)   // selected notebook/note row (list focused), text-select handles, new note/notebook buttons
val NotesYellowDark = Color(0xFFF9B524)    // main tint color, caret, modal text buttons, active text field
val NotesYellowDimmed = Color(0xFFFBE699)  // selected note row when the editor (not list) has focus
// Dark-mode counterpart of NotesYellowDimmed. The pale tint above only works under
// dark text; in dark mode the row label is near-white, so the yellow is shaded down
// rather than tinted up (brand yellow #F9B524 at 62% brightness, hue/saturation kept).
// Mirrors Mac's AppColors.dimmedYellowDark. Apple Notes does the same: #FFE381 light,
// #9E8223 dark.
val NotesYellowDimmedDark = Color(0xFF9E7417)
val NotesYellowTextSelect = Color(0xFFFAEBC3) // text selection highlight in the editor

// Selected-but-unfocused row backgrounds — mirrors Mac's AppColors.swift
// sidebarSelectedInactiveBackground/noteRowSelectedInactiveBackground.
val NoteRowSelectedInactiveLight = Color(0xFFDDDCDC)
val NoteRowSelectedInactiveDark = Color(0xFF474546)

// Note list backgrounds + editor topbar/toolbar. Light values match iOS's
// systemGroupedBackground / secondarySystemGroupedBackground; dark values are
// their standard iOS dark-mode counterparts.
val GroupedBackgroundLight = Color(0xFFF2F2F6)
val GroupedBackgroundDark = Color(0xFF1C1C1E)
val CardBackgroundLight = Color.White
val CardBackgroundDark = Color(0xFF2C2C2E)
val SearchFieldBackgroundLight = Color(0xFFFCFCFC)
val SearchFieldBackgroundDark = Color(0xFF2C2C2E)

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)
