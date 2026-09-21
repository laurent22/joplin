package com.ikuteam.notestn.ui.notelist

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Notes
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FabPosition
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.material3.TextButton
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import kotlin.math.abs
import androidx.compose.material3.SwipeToDismissBoxState
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.ikuteam.notestn.data.DatabaseManager
import com.ikuteam.notestn.data.Note
import com.ikuteam.notestn.ui.common.BackdropBlurState
import com.ikuteam.notestn.ui.common.backdropBlurBackground
import com.ikuteam.notestn.ui.common.captureForBackdropBlur
import com.ikuteam.notestn.ui.common.rememberBackdropBlurState
import com.ikuteam.notestn.ui.common.rememberIsOnline
import com.ikuteam.notestn.ui.theme.CardBackgroundDark
import com.ikuteam.notestn.ui.theme.CardBackgroundLight
import com.ikuteam.notestn.ui.theme.GroupedBackgroundDark
import com.ikuteam.notestn.ui.theme.GroupedBackgroundLight
import com.ikuteam.notestn.ui.theme.NoteRowSelectedInactiveDark
import com.ikuteam.notestn.ui.theme.NoteRowSelectedInactiveLight
import com.ikuteam.notestn.ui.theme.NotesYellowDimmed
import com.ikuteam.notestn.ui.theme.NotesYellowDimmedDark
import com.ikuteam.notestn.ui.theme.NotesYellowTextSelect
import com.ikuteam.notestn.ui.theme.NotesYellowVivid
import com.ikuteam.notestn.ui.theme.SearchFieldBackgroundDark
import com.ikuteam.notestn.ui.theme.SearchFieldBackgroundLight
import com.ikuteam.notestn.viewmodel.NotesViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

// MARK: - Section grouping (mirrors NoteListView.swift NoteGroup)

private sealed class NoteGroup(val order: Int) {
    object Today : NoteGroup(0)
    object Yesterday : NoteGroup(1)
    object Previous7Days : NoteGroup(2)
    object Previous30Days : NoteGroup(3)
    // Current year only, e.g. "March" — older years are grouped whole via Year below,
    // with no month breakdown.
    data class Month(val month: Int) : NoteGroup(4)
    data class Year(val year: Int) : NoteGroup(5)

    fun title(currentYear: Int): String = when (this) {
        Today -> "Today"
        Yesterday -> "Yesterday"
        Previous7Days -> "Previous 7 Days"
        Previous30Days -> "Previous 30 Days"
        is Month -> java.time.Month.of(month).getDisplayName(TextStyle.FULL, Locale.getDefault())
        is Year -> year.toString()
    }

    // Stable LazyColumn key. The old "header-${hashCode()}" mixed identity hashes
    // (the singleton objects) with structural hashes (the data classes) — a collision
    // between any two would crash with a duplicate-key exception.
    val key: String
        get() = when (this) {
            Today -> "today"
            Yesterday -> "yesterday"
            Previous7Days -> "previous7"
            Previous30Days -> "previous30"
            is Month -> "month-$month"
            is Year -> "year-$year"
        }
}

private val zone: ZoneId = ZoneId.systemDefault()

// Row title / section header text is 80% bigger than the base Material scale, per request.
private const val BIGGER_TEXT_SCALE = 1.8f

private fun groupFor(note: Note, today: LocalDate): NoteGroup {
    val noteDate = Instant.ofEpochMilli(note.updatedTime).atZone(zone).toLocalDate()
    val days = ChronoUnit.DAYS.between(noteDate, today)
    return when {
        noteDate == today -> NoteGroup.Today
        days == 1L -> NoteGroup.Yesterday
        days < 7 -> NoteGroup.Previous7Days
        days < 30 -> NoteGroup.Previous30Days
        noteDate.year == today.year -> NoteGroup.Month(noteDate.monthValue)
        else -> NoteGroup.Year(noteDate.year)
    }
}

private fun rowDateString(note: Note, today: LocalDate): String {
    val instant = Instant.ofEpochMilli(note.updatedTime)
    val zoned = instant.atZone(zone)
    val noteDate = zoned.toLocalDate()
    val days = ChronoUnit.DAYS.between(noteDate, today)
    return when {
        noteDate == today -> DateTimeFormatter.ofPattern("HH:mm").format(zoned)
        days == 1L -> "Yesterday"
        days < 7 -> zoned.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault())
        else -> DateTimeFormatter.ofLocalizedDate(FormatStyle.SHORT).withLocale(Locale.getDefault()).format(noteDate)
    }
}

/**
 * Mirrors Mac/NotesTN/NotesTN/Views/NoteListView.swift: search + notes grouped by
 * recency (flat list while searching). The search field and "New Note" button float
 * together as a bottom bar over the list, mirroring the sidebar's floating add-notebook
 * button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteListScreen(
    viewModel: NotesViewModel,
    onNoteClick: (Note) -> Unit,
    isTrash: Boolean = false,
    selectedNoteId: String? = null,
    focusSearchOnLaunch: Boolean = false,
    onOpenSidebar: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val liveNotes by viewModel.notes.collectAsStateWithLifecycle()
    val trashedNotes by viewModel.trashedNotes.collectAsStateWithLifecycle()
    val trashedFolders by viewModel.trashedFolders.collectAsStateWithLifecycle()
    val notes = if (isTrash) trashedNotes else liveNotes
    val searchText by viewModel.searchText.collectAsStateWithLifecycle()
    val selectedFolder by viewModel.selectedFolder.collectAsStateWithLifecycle()
    val isFocusingSearch by viewModel.isFocusingSearch.collectAsStateWithLifecycle()
    val isSyncing by viewModel.isSyncing.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()
    val syncError by viewModel.syncError.collectAsStateWithLifecycle()
    // Read once at screen level instead of inside each row's lambda — reading the
    // state per row made every visible row recompose whenever focus flipped between
    // the list and the editor (two-pane); this way only the selected row's
    // parameters actually change.
    val editorFocused = viewModel.isEditorFocused
    val darkTheme = isSystemInDarkTheme()
    val groupedBackground = if (darkTheme) GroupedBackgroundDark else GroupedBackgroundLight
    val cardBackground = if (darkTheme) CardBackgroundDark else CardBackgroundLight
    val searchFieldBackground = if (darkTheme) SearchFieldBackgroundDark else SearchFieldBackgroundLight
    var confirmEmptyTrash by remember { mutableStateOf(false) }
    // Keyed on the note lists (not remember {} with no keys): a plain remember froze
    // "today" at whatever date the screen first composed on. In an app that stays in
    // memory for days, every "Today"/"Yesterday" label and date group was wrong after
    // midnight until the app was killed and reopened — one of the "temporary visual
    // glitches fixed by restart". Any data refresh (sync, edit, folder switch)
    // re-evaluates it now.
    val today = remember(liveNotes, trashedNotes) { LocalDate.now(ZoneId.systemDefault()) }
    val currentYear = today.year

    val navTitle = when {
        isTrash -> "Trash"
        searchText.isNotEmpty() -> "Search Results"
        else -> selectedFolder?.title ?: "All Notes"
    }
    val noteCountLabel = if (notes.size == 1) "1 Note" else "${notes.size} Notes"

    // Bottom inset so list content isn't hidden behind the floating search/add bar,
    // plus the gesture bar's own height: the Scaffold no longer insets the content at
    // the bottom (see contentWindowInsets below), so the list runs to the screen edge
    // and this is what keeps the last row scrollable clear of both.
    val listBottomPadding = 88.dp + WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

    // Drives the "No internet connection" strip below the top bar.
    val isOnline = rememberIsOnline()

    // What the status strip below the top bar has to say, if anything. Offline wins
    // over the others: with no connection the sync error is always "couldn't reach
    // Joplin Cloud", and saying that twice, in the app's words rather than the user's,
    // helps nobody.
    val statusMessage = when {
        !isOnline -> "No internet connection."
        isSyncing -> "Syncing…"
        syncError != null -> "Sync failed: $syncError"
        else -> null
    }
    // Measured rather than assumed: the strip's height depends on the text, and the
    // list needs it as extra top padding so its first section header isn't left
    // underneath the strip (the strip is an overlay, so nothing else moves for it).
    val density = LocalDensity.current
    var statusStripHeight by remember { mutableStateOf(0.dp) }
    val listTopInset = if (statusMessage != null) statusStripHeight else 0.dp

    // Scroll states for the two list branches (search results / grouped). Read by each
    // row's swipe to ignore a horizontal drag that's really part of a scroll — see
    // LocalIsListScrolling and SwipeActionsRow.
    val searchListState = rememberLazyListState()
    val groupedListState = rememberLazyListState()
    val isListScrolling = remember(searchListState, groupedListState) {
        { searchListState.isScrollInProgress || groupedListState.isScrollInProgress }
    }

    // Backdrop blur source for the translucent top bar — the list scrolls underneath
    // it and is what gets blurred (see ui/common/BackdropBlur.kt, the same helper the
    // editor's formatting toolbar uses).
    val blurState = rememberBackdropBlurState()

    Scaffold(
        modifier = modifier,
        containerColor = groupedBackground,
        topBar = {
            // Translucent, with the list blurred behind it rather than an opaque fill,
            // so scrolled content stays faintly visible as it passes underneath. The
            // bar itself draws nothing: the Box behind it paints the blurred backdrop
            // and the tint over it, in that order.
            Box(
                modifier = Modifier
                    // clipToBounds first: backdropBlurBackground paints the captured
                    // layer translated into this element's coordinates, and drawing
                    // isn't confined to an element's own bounds by default — without
                    // this the whole blurred screen is painted over the list. The
                    // editor's toolbar avoids it by clipping to its rounded shape.
                    .clipToBounds()
                    .backdropBlurBackground(blurState)
                    .background(groupedBackground.copy(alpha = 0.78f)),
            ) {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(navTitle, fontWeight = FontWeight.Bold)
                        Text(
                            noteCountLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    // The app opens straight into the last-used notebook's note list
                    // (see NotesNavHost) rather than the notebooks list, so this is
                    // the only way back to it.
                    if (onOpenSidebar != null) {
                        IconButton(onClick = onOpenSidebar) {
                            Icon(Icons.Filled.Menu, contentDescription = "Notebooks")
                        }
                    }
                },
                actions = {
                    if (isTrash && (trashedNotes.isNotEmpty() || trashedFolders.isNotEmpty())) {
                        TextButton(onClick = { confirmEmptyTrash = true }) { Text("Empty Trash") }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
            )
            }
        },
        // Top only, so the list fills to the bottom edge and scrolls underneath the
        // gesture bar instead of stopping above it and leaving a strip of window
        // background. listBottomPadding above keeps the last row reachable.
        contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top),
        floatingActionButtonPosition = FabPosition.Center,
        floatingActionButton = {
            // Notes can't be created directly in Trash — only search is offered there.
            FloatingSearchAndAddBar(
                searchText = searchText,
                onSearchTextChange = { viewModel.search(it) },
                onClear = { viewModel.clearSearch() },
                requestFocus = isFocusingSearch || focusSearchOnLaunch,
                onFocusConsumed = { viewModel.consumeFocusSearch() },
                // Routes through onNoteClick (not just viewModel.createNote()) so the
                // new note opens immediately — on compact width that's the callback
                // that also navigates to the editor destination (see NotesNavHost);
                // on two-pane width it's already reactive and this is a no-op re-select.
                onNewNote = { viewModel.createNote { note -> onNoteClick(note) } },
                showAddButton = !isTrash,
                fieldBackground = searchFieldBackground,
                blurState = blurState,
            )
        },
    ) { padding ->
        // The Scaffold's top padding isn't applied to this Box: the list fills the
        // whole screen and passes under the translucent bar, and carries that padding
        // as its own top contentPadding instead so the first row still starts below
        // the bar at rest. The sync indicator and the sync error sit in an overlay
        // below, pinned just under the bar rather than pushing the list down.
        CompositionLocalProvider(LocalIsListScrolling provides isListScrolling) {
        Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().captureForBackdropBlur(blurState)) {
            PullToRefreshBox(
                // isRefreshing (user-initiated), not isSyncing — driving this with
                // isSyncing made the refresh spinner flash into view for every
                // 2s-debounced background push (i.e. after each pause in typing on
                // two-pane devices). Background sync activity still shows in the
                // slim progress bar above.
                isRefreshing = isRefreshing,
                // Plain sync, not force — force skips the local-vs-remote timestamp
                // check entirely (see JoplinSyncEngine.upsertNote), which would let a
                // pull-to-refresh run right after a not-yet-pushed local delete
                // overwrite it with the still-undeleted server copy, undoing it.
                onRefresh = { viewModel.refreshNow() },
                modifier = Modifier.weight(1f),
            ) {
            if (notes.isEmpty()) {
                EmptyState(isSearching = searchText.isNotEmpty(), onCreateNote = { viewModel.createNote { note -> onNoteClick(note) } })
            } else if (searchText.isNotEmpty()) {
                LazyColumn(
                    state = searchListState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        top = padding.calculateTopPadding() + listTopInset,
                        bottom = listBottomPadding,
                    ),
                ) {
                    items(notes, key = { it.id }) { note ->
                        NoteRow(
                            note = note,
                            dateString = rowDateString(note, today),
                            selected = note.id == selectedNoteId,
                            editorFocused = editorFocused,
                            isTrash = isTrash,
                            // Highlights the matched text in this result's title/preview.
                            highlightQuery = searchText,
                            // Flat search results sit directly on the screen background.
                            surface = groupedBackground,
                            onClick = { onNoteClick(note) },
                            onDelete = { viewModel.deleteNote(note) },
                            onRestore = { viewModel.restoreNote(note) },
                            onPermanentDelete = { viewModel.permanentlyDeleteNote(note) },
                            onTogglePin = { viewModel.togglePin(note) },
                        )
                    }
                }
            } else {
                // Pinning only applies to live notes — pulled out of their date group
                // into their own section (first, like Apple Notes) so a note doesn't
                // appear twice.
                // remember()ed — filtering, grouping and sorting the whole list used
                // to re-run on every recomposition (every keystroke-save, sync tick,
                // selection change), not just when the data actually changed.
                val pinnedNotes = remember(notes, isTrash) {
                    if (isTrash) emptyList() else notes.filter { it.isPinned }.sortedByDescending { it.updatedTime }
                }
                val grouped = remember(notes, isTrash, today) {
                    val unpinnedNotes = if (isTrash) notes else notes.filterNot { it.isPinned }
                    unpinnedNotes.groupBy { groupFor(it, today) }
                        .toSortedMap(
                            compareBy(
                                { it.order },
                                { (it as? NoteGroup.Month)?.month?.let { m -> -m } ?: 0 },
                                { (it as? NoteGroup.Year)?.year?.let { y -> -y } ?: 0 }
                            )
                        )
                }

                LazyColumn(
                    state = groupedListState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        top = padding.calculateTopPadding() + listTopInset,
                        bottom = listBottomPadding,
                    ),
                ) {
                    if (pinnedNotes.isNotEmpty()) {
                        item(key = "header-pinned") {
                            Text(
                                "Pinned",
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp),
                            )
                        }
                        noteCardRows(
                            notes = pinnedNotes,
                            today = today,
                            selectedNoteId = selectedNoteId,
                            editorFocused = editorFocused,
                            isTrash = false,
                            cardBackground = cardBackground,
                            viewModel = viewModel,
                            onNoteClick = onNoteClick,
                        )
                    }
                    if (isTrash && trashedFolders.isNotEmpty()) {
                        item(key = "header-trashed-notebooks") {
                            Text(
                                "Notebooks",
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp),
                            )
                        }
                        item(key = "card-trashed-notebooks") {
                            Surface(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                shape = RoundedCornerShape(14.dp),
                                color = cardBackground,
                            ) {
                                Column {
                                    trashedFolders.forEachIndexed { index, folder ->
                                        TrashedFolderRow(
                                            title = folder.title,
                                            onRestore = { viewModel.restoreFolder(folder) },
                                            onPermanentDelete = { viewModel.permanentlyDeleteFolder(folder) },
                                        )
                                        if (index != trashedFolders.lastIndex) {
                                            HorizontalDivider(
                                                modifier = Modifier.padding(start = 16.dp, end = 16.dp),
                                                thickness = 0.5.dp,
                                                color = MaterialTheme.colorScheme.outlineVariant,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    grouped.forEach { (group, groupNotes) ->
                        item(key = "header-${group.key}") {
                            Text(
                                group.title(currentYear),
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp),
                            )
                        }
                        // One LazyColumn item PER ROW (see noteCardRows) instead of one
                        // giant item wrapping the whole group — LazyColumn can't
                        // virtualize inside an item, so a month group with 100+ notes
                        // used to compose and measure every row in a single frame the
                        // moment it scrolled into view, defeating lazy lists entirely.
                        noteCardRows(
                            notes = groupNotes,
                            today = today,
                            selectedNoteId = selectedNoteId,
                            editorFocused = editorFocused,
                            isTrash = isTrash,
                            cardBackground = cardBackground,
                            viewModel = viewModel,
                            onNoteClick = onNoteClick,
                        )
                    }
                }
            }
            }
        }

            // One status strip for everything the list has to say about syncing,
            // pinned just under the top bar. An overlay rather than part of the column
            // above, so it never shifts the list: it used to push everything down and
            // back up each time the 2s-debounced background push ran, i.e. periodically
            // while typing. The list makes room for it through listTopInset instead.
            if (statusMessage != null) {
                Row(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = padding.calculateTopPadding())
                        .fillMaxWidth()
                        // Same frosted treatment as the bar above it: the list blurred
                        // behind a translucent yellow rather than a flat fill, so the
                        // two read as one piece of chrome. clipToBounds first, or the
                        // blurred backdrop is painted over the whole list — drawing
                        // isn't confined to an element's bounds by default.
                        .clipToBounds()
                        .backdropBlurBackground(blurState)
                        .background(NotesYellowVivid.copy(alpha = 0.86f))
                        .onSizeChanged { statusStripHeight = with(density) { it.height.toDp() } }
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        statusMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Black,
                        modifier = Modifier.weight(1f),
                    )
                    // Only a real failure needs dismissing — the other two clear
                    // themselves when the connection or the sync does.
                    if (isOnline && !isSyncing && syncError != null) {
                        TextButton(onClick = { viewModel.clearSyncError() }) {
                            Text("Dismiss", color = Color.Black)
                        }
                    }
                }
            }
        }
        }
    }

    if (confirmEmptyTrash) {
        AlertDialog(
            onDismissRequest = { confirmEmptyTrash = false },
            title = { Text("Empty Trash") },
            text = { Text("Permanently delete everything in Trash? This can't be undone.") },
            confirmButton = {
                TextButton(onClick = { viewModel.emptyTrash(); confirmEmptyTrash = false }) { Text("Empty Trash") }
            },
            dismissButton = {
                TextButton(onClick = { confirmEmptyTrash = false }) { Text("Cancel") }
            },
        )
    }
}

// MARK: - Search highlighting

/**
 * Returns [text] as an AnnotatedString with every case-insensitive occurrence of
 * [query] given a strong-yellow background — used to highlight the matched text in
 * note list search results, matching the in-note find's current-match highlight.
 * Matching is done on the original text with ignoreCase (no lowercasing, so match
 * lengths stay aligned to the source). Returns the plain text when [query] is empty.
 */
private fun highlightMatches(
    text: String,
    query: String,
    background: Color,
): AnnotatedString {
    if (query.isEmpty()) return AnnotatedString(text)
    return buildAnnotatedString {
        var start = 0
        while (start <= text.length) {
            val idx = text.indexOf(query, start, ignoreCase = true)
            if (idx < 0) {
                append(text.substring(start))
                break
            }
            append(text.substring(start, idx))
            withStyle(SpanStyle(background = background)) {
                append(text.substring(idx, idx + query.length))
            }
            start = idx + query.length
        }
    }
}

// MARK: - Per-row card items

/**
 * Emits one LazyColumn item per note, drawn so the section still reads as a single
 * rounded card (first/last corners rounded, hairline dividers between rows) —
 * visually identical to the old one-Surface-per-group approach, but each row is its
 * own lazily-composed item. See the call site comment in NoteListScreen.
 */
private fun LazyListScope.noteCardRows(
    notes: List<Note>,
    today: LocalDate,
    selectedNoteId: String?,
    editorFocused: Boolean,
    isTrash: Boolean,
    cardBackground: Color,
    viewModel: NotesViewModel,
    onNoteClick: (Note) -> Unit,
) {
    itemsIndexed(notes, key = { _, note -> note.id }) { index, note ->
        val shape = when {
            notes.size == 1 -> RoundedCornerShape(14.dp)
            index == 0 -> RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)
            index == notes.lastIndex -> RoundedCornerShape(bottomStart = 14.dp, bottomEnd = 14.dp)
            else -> RectangleShape
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(shape)
                .background(cardBackground),
        ) {
            NoteRow(
                note = note,
                dateString = rowDateString(note, today),
                selected = note.id == selectedNoteId,
                editorFocused = editorFocused,
                isTrash = isTrash,
                // Grouped rows sit on the section card.
                surface = cardBackground,
                onClick = { onNoteClick(note) },
                onDelete = { viewModel.deleteNote(note) },
                onRestore = { viewModel.restoreNote(note) },
                onPermanentDelete = { viewModel.permanentlyDeleteNote(note) },
                onTogglePin = { viewModel.togglePin(note) },
            )
            if (index != notes.lastIndex) {
                HorizontalDivider(
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp),
                    thickness = 0.5.dp,
                    color = MaterialTheme.colorScheme.outlineVariant,
                )
            }
        }
    }
}

// The search bar and the new note button are solid; the blurred-glass treatment they
// used to have now belongs to the top bar instead (see the Scaffold's topBar above).
// The helper itself lives in ui/common/BackdropBlur.kt, shared with EditorScreen's
// formatting toolbar.

// MARK: - Floating search + add bar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FloatingSearchAndAddBar(
    searchText: String,
    onSearchTextChange: (String) -> Unit,
    onClear: () -> Unit,
    requestFocus: Boolean,
    onFocusConsumed: () -> Unit,
    onNewNote: () -> Unit,
    fieldBackground: Color,
    blurState: BackdropBlurState,
    showAddButton: Boolean = true,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            // 28dp each side: the search field's left margin and the New Note
            // button's right margin. The editor's Edit note FAB is padded to the same
            // 28dp so the two buttons line up between screens.
            .padding(horizontal = 28.dp)
            .navigationBarsPadding()
            .imePadding(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        FloatingSearchField(
            text = searchText,
            onTextChange = onSearchTextChange,
            onClear = onClear,
            requestFocus = requestFocus,
            onFocusConsumed = onFocusConsumed,
            background = fieldBackground,
            blurState = blurState,
            modifier = Modifier.weight(1f),
        )
        if (showAddButton) {
            // The platform's own FAB, the same one the editor uses for Edit note,
            // rather than a hand-built button: same size, shape, elevation and ripple
            // as every other FAB in the app, and it follows the platform if that
            // changes. It replaced a custom Box that existed only to sit a blurred
            // backdrop behind the fill, which the solid FAB no longer needs.
            FloatingActionButton(
                onClick = onNewNote,
                // Frosted like the search field beside it: the FAB draws no container
                // of its own, and the modifiers below paint the blurred list under a
                // translucent yellow instead. Elevation is 0 for the same reason the
                // search field has no shadow() — that layer sits between the list and
                // this button's own drawing, and shows through a translucent fill as a
                // solid block.
                modifier = Modifier
                    .clip(FloatingActionButtonDefaults.shape)
                    .backdropBlurBackground(blurState)
                    .background(NotesYellowVivid.copy(alpha = 0.86f)),
                containerColor = Color.Transparent,
                contentColor = Color.Black,
                elevation = FloatingActionButtonDefaults.elevation(
                    defaultElevation = 0.dp,
                    pressedElevation = 0.dp,
                    focusedElevation = 0.dp,
                    hoveredElevation = 0.dp,
                ),
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Note")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FloatingSearchField(
    text: String,
    onTextChange: (String) -> Unit,
    onClear: () -> Unit,
    requestFocus: Boolean,
    onFocusConsumed: () -> Unit,
    background: Color,
    blurState: BackdropBlurState,
    modifier: Modifier = Modifier,
) {
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(requestFocus) {
        if (requestFocus) {
            focusRequester.requestFocus()
            onFocusConsumed()
        }
    }

    // Matches the FAB next to it exactly — 56dp tall, 16dp corners, same elevation —
    // so the two read as one floating control group. `modifier` already carries
    // `weight(1f)` from the caller's Row, so only height needs fixing here.
    //
    // Frosted like the top bar: the list blurred behind its own fill rather than an
    // opaque one, so notes passing underneath stay faintly visible. clip(shape) sits
    // ahead of the blur, which both rounds the corners and confines it — drawing isn't
    // limited to an element's bounds by default.
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier
            .height(56.dp)
            // No shadow(): its graphics layer sits between the list and this field's
            // own drawing, and with a translucent fill over it that layer was showing
            // as a pale rectangle inside the field. The yellow border carries the
            // separation from the list on its own.
            .clip(shape)
            .backdropBlurBackground(blurState)
            .background(background.copy(alpha = 0.86f))
            .border(0.5.dp, NotesYellowVivid, shape),
    ) {
        Row(
            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            // A bare BasicTextField with the placeholder drawn behind it, rather than
            // Material's TextField or TextFieldDefaults.DecorationBox. Two reasons:
            // TextField bakes in a 56dp min height through padding that its own
            // parameters can't override, which clipped the text in this field; and the
            // decoration box paints a container behind the text whatever colours it's
            // given, which showed as a solid rectangle over the field's frosted
            // background. Neither is worth working around for what amounts to one line
            // of grey text.
            BasicTextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier
                    .weight(1f)
                    .focusRequester(focusRequester),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            ) { innerTextField ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (text.isEmpty()) {
                        Text(
                            "Search",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    innerTextField()
                }
            }
            if (text.isNotEmpty()) {
                IconButton(onClick = onClear) {
                    Icon(Icons.Default.Clear, contentDescription = "Clear search")
                }
            }
        }
    }
}

/** How far a row has to travel before a swipe counts, as a fraction of its width.
 * RecyclerView's ItemTouchHelper — what Gmail's swipe is built on — uses 0.5f. */
private const val SWIPE_COMMIT_FRACTION = 0.4f

/** Whether the note list is being scrolled right now, read by each row's swipe.
 * A lambda rather than a plain Boolean, and static, so that scrolling doesn't
 * recompose every visible row just to update it. */
private val LocalIsListScrolling = staticCompositionLocalOf<() -> Boolean> { { false } }

/**
 * Swipe actions for a note row (an alternative to the long-press menu, which is
 * unchanged). Swipe right to pin/unpin, swipe left to delete — the action fires once
 * the row is dragged past 40% of its width, like Gmail; a shorter swipe springs back.
 *
 * Built on Material 3's SwipeToDismissBox so the drag tracking, velocity/fling
 * settling and animations are the platform's own rather than hand-rolled.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeActionsRow(
    onPin: () -> Unit,
    onDelete: () -> Unit,
    isPinned: Boolean,
    enabled: Boolean,
    surface: Color,
    content: @Composable () -> Unit,
) {
    if (!enabled) {
        content()
        return
    }
    val isListScrolling = LocalIsListScrolling.current
    var rowWidthPx by remember { mutableFloatStateOf(0f) }
    // Holds the state so confirmValueChange can read the offset it was dragged to —
    // the lambda is built before the state exists, so it can't capture it directly.
    val stateHolder = remember { arrayOfNulls<SwipeToDismissBoxState>(1) }

    val state = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            val offset = stateHolder[0]?.let { runCatching { abs(it.requireOffset()) }.getOrDefault(0f) } ?: 0f
            // Two guards, both about telling a real swipe from a scroll that drifted
            // sideways. The row has to have actually travelled far enough, whatever
            // the velocity was, and the list mustn't be scrolling underneath it.
            //
            // The distance check is the important one. Material3's SwipeToDismissBox
            // commits on velocity alone once the fling passes 125dp/s, ahead of any
            // positional threshold, and that value isn't configurable
            // (AnchoredDraggableMinFlingVelocity, no parameter on the component or on
            // rememberSwipeToDismissBoxState). A quick flick during scrolling clears
            // 125dp/s easily, which is what was firing delete and pin by accident.
            // RecyclerView's ItemTouchHelper, which Gmail's swipe is built on, has the
            // same velocity path but only takes it when the horizontal velocity beats
            // the vertical one; Compose has no such guard, so this stands in for it.
            if (rowWidthPx <= 0f || offset < rowWidthPx * SWIPE_COMMIT_FRACTION) return@rememberSwipeToDismissBoxState false
            if (isListScrolling()) return@rememberSwipeToDismissBoxState false

            when (value) {
                // Pin: the note stays in the list, so accept the action but let the
                // row settle back into place (returning false).
                SwipeToDismissBoxValue.StartToEnd -> {
                    onPin()
                    false
                }
                // Delete: ask first, same confirmation as the long-press menu's
                // "Delete Note". Returning false settles the row back rather than
                // dismissing it — the outcome isn't known yet, and cancelling the
                // dialog would otherwise leave the row stuck off screen. On confirm
                // the note moves to Trash and the row leaves the list on its own.
                SwipeToDismissBoxValue.EndToStart -> {
                    onDelete()
                    false
                }
                SwipeToDismissBoxValue.Settled -> false
            }
        },
        // The slow-drag path. Material3's own default here is a flat 56dp, which is a
        // very short distance on a phone-width row.
        positionalThreshold = { totalDistance -> totalDistance * SWIPE_COMMIT_FRACTION },
    )
    stateHolder[0] = state

    SwipeToDismissBox(
        state = state,
        modifier = Modifier.onSizeChanged { rowWidthPx = it.width.toFloat() },
        backgroundContent = {
            val isDelete = state.dismissDirection == SwipeToDismissBoxValue.EndToStart
            val background = when (state.dismissDirection) {
                SwipeToDismissBoxValue.StartToEnd -> NotesYellowVivid
                SwipeToDismissBoxValue.EndToStart -> MaterialTheme.colorScheme.error
                SwipeToDismissBoxValue.Settled -> Color.Transparent
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(background)
                    .padding(horizontal = 24.dp),
                contentAlignment = if (isDelete) Alignment.CenterEnd else Alignment.CenterStart,
            ) {
                when (state.dismissDirection) {
                    SwipeToDismissBoxValue.StartToEnd -> Icon(
                        Icons.Filled.PushPin,
                        contentDescription = if (isPinned) "Unpin note" else "Pin note",
                        tint = Color.Black,
                    )
                    SwipeToDismissBoxValue.EndToStart -> Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Delete note",
                        tint = MaterialTheme.colorScheme.onError,
                    )
                    SwipeToDismissBoxValue.Settled -> Unit
                }
            }
        },
        // The row must be OPAQUE, otherwise the coloured panel behind it shows
        // straight through and the whole row appears to change colour as soon as the
        // swipe starts. Painting the surface it sits on means the colour is only
        // visible in the strip the row has actually slid away from — the behaviour
        // in Android's swipe-to-dismiss guidance.
        content = {
            Box(modifier = Modifier.fillMaxWidth().background(surface)) { content() }
        },
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun NoteRow(
    note: Note,
    dateString: String,
    selected: Boolean,
    editorFocused: Boolean = false,
    // Non-empty only in search results — highlights each match in the title/preview.
    highlightQuery: String = "",
    // The colour the row sits on. Painted behind the row so the swipe-action panel
    // isn't visible through it — see SwipeActionsRow.
    surface: Color,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    isTrash: Boolean = false,
    onRestore: () -> Unit = {},
    onPermanentDelete: () -> Unit = {},
    onTogglePin: () -> Unit = {},
) {
    var showMenu by remember { mutableStateOf(false) }
    // Still used by the long-press menu's Delete, which stays confirmed: from a menu
    // there's no travel to prove intent, and in Trash it's a permanent delete.
    var confirmDelete by remember { mutableStateOf(false) }
    // produceState on Dispatchers.IO — resourceLocalFile is a synchronous SQLite
    // query, and the old remember(note.id, note.body) ran it on the main thread for
    // every row entering composition (and re-ran it on every keystroke-save of the
    // open note, since the body changed). During a sync the DB is busy writing, so
    // those main-thread reads visibly hitched the list. Keyed on the (cached)
    // firstImageResourceId, so body edits that don't change the first image don't
    // re-query at all.
    val thumbnailFile by produceState<File?>(initialValue = null, note.firstImageResourceId) {
        val resourceId = note.firstImageResourceId
        value = if (resourceId == null) {
            null
        } else {
            withContext(Dispatchers.IO) { DatabaseManager.shared.resourceLocalFile(resourceId) }
        }
    }
    val darkTheme = isSystemInDarkTheme()
    // Search highlight adapts to the theme: the light tint in light mode, the strong
    // vivid yellow in dark mode (the light tint has too little contrast on dark rows /
    // light text). Matches the in-note find's current-match color in dark mode.
    val searchHighlightBg = if (darkTheme) NotesYellowVivid else NotesYellowTextSelect

    Box {
        // Swipe right to Pin, swipe left to Delete — an alternative to the long-press
        // menu below, which still works. Not offered in Trash, where the actions are
        // Restore / Delete Permanently instead.
        SwipeActionsRow(
            // Both swipe actions confirm first — a swipe is easy to trigger by
            // accident while scrolling, so neither should change the note on its own.
            // Both act straight away: the swipe has to cross 40% of the row now
            // (see SWIPE_COMMIT_FRACTION), which is deliberate enough not to need
            // confirming, and delete only moves the note to Trash.
            onPin = onTogglePin,
            onDelete = onDelete,
            isPinned = note.isPinned,
            enabled = !isTrash,
            surface = surface,
        ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .combinedClickable(onClick = onClick, onLongClick = { showMenu = true })
                .background(
                    if (selected) {
                        // editorFocused = the editor pane has focus (typing) in the
                        // tablet two-pane layout -> Gray. Otherwise the note list has
                        // focus (browsing) -> Dimmed yellow. See NotesViewModel.isEditorFocused.
                        if (editorFocused) {
                            if (darkTheme) NoteRowSelectedInactiveDark else NoteRowSelectedInactiveLight
                        } else {
                            if (darkTheme) NotesYellowDimmedDark else NotesYellowDimmed
                        }
                    } else {
                        Color.Transparent
                    }
                )
                // Applied after .background so the selection fill spans the cell edge
                // to edge. It used to sit before it, which inset the fill by 8dp and
                // left a strip of the list's own background showing down both sides of
                // a selected row. Row content keeps exactly the position it had: this
                // 8dp plus the 16dp below is the same 24dp inset as before.
                .padding(horizontal = 8.dp)
                // Only the start (left) side is shared at the Row level now — the end
                // (right) side is applied to the text column instead, so the thumbnail
                // can sit flush against the row's right edge (0 padding) independent of
                // the text's own right margin.
                .padding(start = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
        // Text column carries its own vertical + end (right) padding now (used to come
        // from the Row above, shared with the thumbnail) so the thumbnail's own padding
        // can be set independently, without relying on a negative-padding counter-hack
        // (Compose's Modifier.padding throws at runtime on negative values, unlike
        // SwiftUI's).
        Column(modifier = Modifier.weight(1f).padding(top = 16.dp, end = 16.dp, bottom = 16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (note.isTodo) {
                    Icon(
                        if (note.todoCompleted) Icons.Default.CheckCircle else Icons.Default.Circle,
                        contentDescription = null,
                        tint = if (note.todoCompleted) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.height(20.dp),
                    )
                }
                Text(
                    highlightMatches(note.title.ifEmpty { "Untitled" }, highlightQuery, searchHighlightBg),
                    style = MaterialTheme.typography.bodyLarge.let {
                        it.copy(fontSize = it.fontSize * BIGGER_TEXT_SCALE * 0.8f * 0.8f)
                    },
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
            }
            // Date (plain) + preview (matches highlighted in search results). Only the
            // preview is highlighted — the date can't contain the query anyway.
            val subtitle = buildAnnotatedString {
                append(dateString)
                if (note.preview.isNotEmpty()) {
                    append("  ")
                    append(highlightMatches(note.preview, highlightQuery, searchHighlightBg))
                }
            }
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall.let {
                    it.copy(fontSize = it.fontSize * 1.2f)
                },
                color = if (selected) {
                    // Tracks the selection background above: black on the light
                    // tint, white on the dark shade.
                    if (darkTheme) Color.White.copy(alpha = 0.75f) else Color.Black.copy(alpha = 0.75f)
                } else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
            if (thumbnailFile != null) {
                AsyncImage(
                    model = thumbnailFile,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        // Independent of the text column's own vertical padding (above) —
                        // the Row itself no longer applies shared vertical padding, so this
                        // 4dp is the thumbnail's real, direct top/bottom gap.
                        .padding(start = 12.dp, top = 4.dp, end = 6.dp, bottom = 4.dp)
                        .size(56.dp)
                        .clip(RoundedCornerShape(10.dp)),
                )
            }
        }
        }
        // The menu is anchored to this zero-size Box, so the BOX's placement is what
        // positions the popup: bottom-end of the row, so the menu opens below the row
        // and on the right. (A modifier passed to DropdownMenu itself styles the
        // popup's content, not its anchor — Modifier.align there does nothing.)
        Box(modifier = Modifier.align(Alignment.BottomEnd)) {
            DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                if (isTrash) {
                    DropdownMenuItem(text = { Text("Restore") }, onClick = {
                        showMenu = false
                        onRestore()
                    })
                    DropdownMenuItem(text = { Text("Delete Permanently") }, onClick = {
                        showMenu = false
                        confirmDelete = true
                    })
                } else {
                    DropdownMenuItem(text = { Text(if (note.isPinned) "Unpin Note" else "Pin Note") }, onClick = {
                        showMenu = false
                        onTogglePin()
                    })
                    DropdownMenuItem(text = { Text("Delete Note") }, onClick = {
                        showMenu = false
                        confirmDelete = true
                    })
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(if (isTrash) "Delete Permanently" else "Delete Note") },
            text = {
                Text(
                    if (isTrash) {
                        "Permanently delete \"${note.title.ifEmpty { "Untitled" }}\"? This can't be undone."
                    } else {
                        "Move \"${note.title.ifEmpty { "Untitled" }}\" to Trash?"
                    }
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    if (isTrash) onPermanentDelete() else onDelete()
                    confirmDelete = false
                }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) { Text("Cancel") }
            },
        )
    }

}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun TrashedFolderRow(
    title: String,
    onRestore: () -> Unit,
    onPermanentDelete: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    Box {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(onClick = {}, onLongClick = { showMenu = true })
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
        }
        // Anchored to a top-end Box so it opens on the right — see the note on the
        // note-row menu above.
        Box(modifier = Modifier.align(Alignment.BottomEnd)) {
            DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                DropdownMenuItem(text = { Text("Restore") }, onClick = {
                    showMenu = false
                    onRestore()
                })
                DropdownMenuItem(text = { Text("Delete Permanently") }, onClick = {
                    showMenu = false
                    confirmDelete = true
                })
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete Permanently") },
            text = { Text("Permanently delete \"$title\" and all its notes? This can't be undone.") },
            confirmButton = {
                TextButton(onClick = { onPermanentDelete(); confirmDelete = false }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun EmptyState(isSearching: Boolean, onCreateNote: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            if (isSearching) Icons.Default.Search else Icons.AutoMirrored.Filled.Notes,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.outlineVariant,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            if (isSearching) "No Results" else "No Notes",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (!isSearching) {
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onCreateNote) { Text("Create a Note") }
        }
    }
}
