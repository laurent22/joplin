package com.ikuteam.notestn.ui.nav

import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.material3.VerticalDragHandle
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ikuteam.notestn.ui.editor.EditorEmptyState
import com.ikuteam.notestn.ui.editor.EditorScreen
import com.ikuteam.notestn.ui.notelist.NoteListScreen
import com.ikuteam.notestn.ui.settings.LoginScreen
import com.ikuteam.notestn.ui.settings.SettingsScreen
import com.ikuteam.notestn.ui.sidebar.SidebarScreen
import com.ikuteam.notestn.viewmodel.NotesViewModel

private const val ALL_NOTES_SENTINEL = "all"

/**
 * Navigation host. Phone (Compact width): drill-down stack, sidebar -> note list ->
 * editor, matching a single-column mobile note app. Tablet/large screens (Medium+
 * width): the note-list route shows notes and the editor side by side instead of
 * pushing a new destination — an adaptive approximation of the Mac app's persistent
 * 3-column NavigationSplitView (see Mac/NotesTN/NotesTN/ContentView.swift).
 */
@Composable
fun NotesNavHost(
    viewModel: NotesViewModel,
    windowWidthSizeClass: WindowWidthSizeClass,
) {
    val navController = rememberNavController()
    val isWide = windowWidthSizeClass != WindowWidthSizeClass.Compact

    // Open straight into the last notebook's note list (persisted in NotesViewModel)
    // instead of the notebooks list — the sidebar is still reachable from the note
    // list's navigation icon (see onOpenSidebar below), it's just no longer the
    // first thing shown.
    val startDestination = remember { "notes/${viewModel.selectedFolderId.value ?: ALL_NOTES_SENTINEL}" }

    NavHost(navController = navController, startDestination = startDestination) {
        composable("sidebar") {
            SidebarScreen(
                viewModel = viewModel,
                onFolderClick = { folder ->
                    viewModel.selectFolder(folder)
                    navController.navigate("notes/${folder?.id ?: ALL_NOTES_SENTINEL}")
                },
                onTrashClick = {
                    viewModel.selectTrash()
                    navController.navigate("trash")
                },
                onSettingsClick = { navController.navigate("settings") },
            )
        }

        composable("settings") {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLoginClick = { navController.navigate("login") },
                onForceResync = { viewModel.syncNow(force = true) },
            )
        }

        composable("login") {
            LoginScreen(
                onBack = { navController.popBackStack() },
                onLoggedIn = { navController.popBackStack() },
            )
        }

        composable(
            route = "notes/{folderId}",
            arguments = listOf(navArgument("folderId") { type = NavType.StringType }),
        ) {
            if (isWide) {
                TwoPaneNotesAndEditor(
                    viewModel = viewModel,
                    isTrash = false,
                    onOpenSidebar = { navController.navigate("sidebar") },
                )
            } else {
                NoteListScreen(
                    viewModel = viewModel,
                    isTrash = false,
                    onNoteClick = { note ->
                        viewModel.selectNote(note)
                        navController.navigate("editor/${note.id}")
                    },
                    onOpenSidebar = { navController.navigate("sidebar") },
                )
            }
        }

        composable("trash") {
            if (isWide) {
                TwoPaneNotesAndEditor(
                    viewModel = viewModel,
                    isTrash = true,
                    onOpenSidebar = { navController.navigate("sidebar") },
                )
            } else {
                NoteListScreen(
                    viewModel = viewModel,
                    isTrash = true,
                    onNoteClick = { note ->
                        viewModel.selectNote(note)
                        navController.navigate("editor/${note.id}")
                    },
                    onOpenSidebar = { navController.navigate("sidebar") },
                )
            }
        }

        composable(
            route = "editor/{noteId}",
            arguments = listOf(navArgument("noteId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val noteId = backStackEntry.arguments?.getString("noteId")
            val notes by viewModel.notes.collectAsStateWithLifecycle()
            val trashedNotes by viewModel.trashedNotes.collectAsStateWithLifecycle()
            val note = notes.firstOrNull { it.id == noteId } ?: trashedNotes.firstOrNull { it.id == noteId }
            if (note != null) {
                EditorScreen(
                    note = note,
                    viewModel = viewModel,
                    // From the note itself, not trashedNotes membership — trashedNotes
                    // is only kept fresh while Trash is selected (see loadNotes), so a
                    // stale snapshot could mark a live note read-only here.
                    readOnly = note.deletedTime != null,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}

@Composable
private fun TwoPaneNotesAndEditor(viewModel: NotesViewModel, isTrash: Boolean, onOpenSidebar: () -> Unit) {
    val notes by (if (isTrash) viewModel.trashedNotes else viewModel.notes).collectAsStateWithLifecycle()
    val selectedNoteId by viewModel.selectedNoteId.collectAsStateWithLifecycle()
    val selectedNote = notes.firstOrNull { it.id == selectedNoteId }

    // BoxWithConstraints so the note-list width can be clamped against the space this
    // layout actually has, rather than a fixed number: the same app runs on a folded
    // phone, an unfolded one and a tablet, and a width that is reasonable on one would
    // leave no room for the editor on another.
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        // Lower bound keeps a note row readable (title + date still fit); upper bound
        // always leaves the editor the larger share.
        val minPaneWidth = 240.dp
        val maxPaneWidth = (maxWidth * 0.6f).coerceAtLeast(minPaneWidth)
        val paneWidth = viewModel.noteListPaneWidthDp.dp.coerceIn(minPaneWidth, maxPaneWidth)

        // Shared with the drag handle so it shows its own pressed/dragged state while
        // the divider is being moved, instead of us drawing that state by hand.
        val interactionSource = remember { MutableInteractionSource() }
        val dragState = rememberDraggableState { deltaPx ->
            val deltaDp = with(density) { deltaPx.toDp() }
            viewModel.updateNoteListPaneWidthDp(
                (paneWidth + deltaDp).coerceIn(minPaneWidth, maxPaneWidth).value
            )
        }

        Row(modifier = Modifier.fillMaxSize()) {
            NoteListScreen(
                viewModel = viewModel,
                isTrash = isTrash,
                onNoteClick = { note -> viewModel.selectNote(note) },
                selectedNoteId = selectedNoteId,
                onOpenSidebar = onOpenSidebar,
                modifier = Modifier.width(paneWidth).fillMaxHeight(),
            )
            // Material 3's own drag handle rather than a hand-drawn divider — it brings
            // the platform's touch target, shape, colours and press feedback with it.
            // The draggable sits on the surrounding Box so the whole strip responds,
            // not just the handle glyph.
            Box(
                modifier = Modifier
                    // Half of the 48dp the drag handle claims on its own (Material's
                    // minimum touch target), which left a conspicuously wide empty gap
                    // between the panes for a 4dp handle. See the note in the summary:
                    // this is deliberately under that 48dp minimum.
                    .width(24.dp)
                    .fillMaxHeight()
                    .draggable(
                        state = dragState,
                        orientation = Orientation.Horizontal,
                        interactionSource = interactionSource,
                        // One SharedPreferences write per drag, not per frame.
                        onDragStopped = { viewModel.persistNoteListPaneWidthDp() },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                VerticalDragHandle(interactionSource = interactionSource)
            }
            Box(modifier = Modifier.weight(1f).fillMaxHeight()) {
                if (selectedNote != null) {
                    EditorScreen(note = selectedNote, viewModel = viewModel, readOnly = isTrash, onBack = null)
                } else {
                    EditorEmptyState(onCreateNote = { viewModel.createNote() })
                }
            }
        }
    }
}
