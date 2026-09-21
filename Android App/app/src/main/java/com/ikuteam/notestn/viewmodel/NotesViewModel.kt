package com.ikuteam.notestn.viewmodel

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ikuteam.notestn.data.DatabaseManager
import com.ikuteam.notestn.data.Folder
import com.ikuteam.notestn.data.Note
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.ikuteam.notestn.data.joplin.JoplinAccountStore
import com.ikuteam.notestn.data.joplin.JoplinCloudApi
import com.ikuteam.notestn.data.joplin.JoplinSyncEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Mirrors Mac/NotesTN/NotesTN/ViewModels/AppState.swift.
 *
 * DB calls are the same synchronous SQLite operations as the Mac app, but are
 * pushed to Dispatchers.IO here since Android disallows disk I/O on the main thread.
 */
class NotesViewModel(application: Application) : AndroidViewModel(application) {

    private val db = DatabaseManager.shared
    private val prefs = application.getSharedPreferences("notestn_prefs", Application.MODE_PRIVATE)
    private val selectedNoteKey = "lastSelectedNoteID"
    private val selectedFolderKey = "lastSelectedFolderID"
    private val noteListPaneWidthKey = "noteListPaneWidthDp"
    private val syncEngine = JoplinSyncEngine(application)

    // MARK: - Published state

    private val _folders = MutableStateFlow<List<Folder>>(emptyList())
    val folders: StateFlow<List<Folder>> = _folders.asStateFlow()

    private val _notes = MutableStateFlow<List<Note>>(emptyList())
    val notes: StateFlow<List<Note>> = _notes.asStateFlow()

    private val _trashedNotes = MutableStateFlow<List<Note>>(emptyList())
    val trashedNotes: StateFlow<List<Note>> = _trashedNotes.asStateFlow()

    private val _trashedFolders = MutableStateFlow<List<Folder>>(emptyList())
    val trashedFolders: StateFlow<List<Folder>> = _trashedFolders.asStateFlow()

    private val _isTrashSelected = MutableStateFlow(false)
    val isTrashSelected: StateFlow<Boolean> = _isTrashSelected.asStateFlow()

    // True while the ProseMirror editor's contentEditable region has keyboard
    // focus (vs. the note list) — drives the selected note row's Gray (editor
    // focused) vs. Dimmed yellow (list focused) background in tablet/two-pane
    // mode. See EditorScreen.kt's onFocusChanged. Plain Compose state (not
    // StateFlow) since it's only read by composables and never needs a
    // cold-start replay value.
    var isEditorFocused by mutableStateOf(false)

    // Width (in dp) of the note-list column in the tablet/fold two-pane layout, set by
    // dragging the divider between the two panes (see NotesNavHost's
    // TwoPaneNotesAndEditor). Kept here rather than as composable state so it survives
    // recomposition and configuration changes, and persisted so the split the user
    // chose is still there next launch. The default is the width the column used to be
    // pinned to. NotesNavHost clamps it to the space actually available, so a width
    // saved on a wide screen can't strand the editor off-screen on a narrow one.
    var noteListPaneWidthDp by mutableFloatStateOf(prefs.getFloat(noteListPaneWidthKey, 360f))
        private set

    /** Called continuously while the divider is dragged — state only, no disk writes. */
    fun updateNoteListPaneWidthDp(widthDp: Float) {
        noteListPaneWidthDp = widthDp
    }

    /** Called once when the drag ends, so a drag is one write instead of hundreds. */
    fun persistNoteListPaneWidthDp() {
        prefs.edit().putFloat(noteListPaneWidthKey, noteListPaneWidthDp).apply()
    }

    // null = "All Notes". Restored synchronously here (not in the async init{} block
    // below) so NotesNavHost can read the last-open notebook via .value before its
    // first composition, to start directly on the note list instead of the sidebar.
    private val _selectedFolderId = MutableStateFlow(prefs.getString(selectedFolderKey, null))
    val selectedFolderId: StateFlow<String?> = _selectedFolderId.asStateFlow()

    private val _selectedNoteId = MutableStateFlow<String?>(null)
    val selectedNoteId: StateFlow<String?> = _selectedNoteId.asStateFlow()

    private val _searchText = MutableStateFlow("")
    val searchText: StateFlow<String> = _searchText.asStateFlow()

    private val _isFocusingSearch = MutableStateFlow(false)
    val isFocusingSearch: StateFlow<Boolean> = _isFocusingSearch.asStateFlow()

    // Id of a note that was just created via createNote — the editor opens it directly
    // in edit mode (keyboard up), since a brand-new blank note has nothing to read.
    // Every other note opens in read mode. Consumed once by the editor (see
    // consumePendingEdit) so it only applies to the initial open.
    private val _pendingEditNoteId = MutableStateFlow<String?>(null)
    val pendingEditNoteId: StateFlow<String?> = _pendingEditNoteId.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    // User-initiated refresh (pull-to-refresh) only — distinct from isSyncing, which
    // also covers background pushes (the 2s debounce after every edit). Driving the
    // pull-to-refresh spinner with isSyncing made it flash into view every few
    // seconds while typing. See refreshNow().
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _syncError = MutableStateFlow<String?>(null)
    val syncError: StateFlow<String?> = _syncError.asStateFlow()

    // MARK: - Derived

    val selectedNote: StateFlow<Note?> = combine(_notes, _trashedNotes, _selectedNoteId) { notes, trashed, id ->
        notes.firstOrNull { it.id == id } ?: trashed.firstOrNull { it.id == id }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val selectedFolder: StateFlow<Folder?> = combine(_folders, _selectedFolderId) { folders, id ->
        folders.firstOrNull { it.id == id }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    // MARK: - Init

    // Declared before init{} (which registers it) — see the registration comment
    // below for why this is a named field instead of an anonymous object.
    private val foregroundSyncObserver = object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            syncNow()
        }
    }

    init {
        viewModelScope.launch {
            loadAll()
            restoreSelection()
            withContext(Dispatchers.IO) { purgeExpiredTrash() }
            loadAll()
        }

        // Fires once immediately with whatever account state already exists (so an
        // already-logged-in user gets synced on launch), and again any time a login
        // happens later — JoplinAccountStore is a singleton, so this sees every login
        // regardless of which screen it happened on.
        viewModelScope.launch {
            JoplinAccountStore.shared.account.collectLatest { account ->
                if (account != null) syncNow()
            }
        }

        // Joplin Cloud sessions are fixed at 12 hours with no renewal (see
        // SessionModel.ts server-side) — re-checking when the app comes back to the
        // foreground gives a session that died while backgrounded a chance to be
        // silently replaced (see runSync's Unauthorized handling) before the user
        // notices. ProcessLifecycleOwner fires ON_START at the app level (any Activity
        // resuming from background), not per-Activity onResume.
        // Kept as a field and removed in onCleared() — ProcessLifecycleOwner is a
        // process-wide singleton, so an anonymous observer added here would hold this
        // ViewModel (and its sync engine) forever, and re-entering the app after the
        // Activity was destroyed would stack a second observer (duplicate syncs).
        ProcessLifecycleOwner.get().lifecycle.addObserver(foregroundSyncObserver)
    }

    override fun onCleared() {
        ProcessLifecycleOwner.get().lifecycle.removeObserver(foregroundSyncObserver)
        super.onCleared()
    }

    // MARK: - Joplin Cloud sync (pull + push, see JoplinSyncEngine)

    // Set when syncNow() is called while a sync is already running (e.g. the
    // debounced push after an edit lands mid pull-to-refresh) — without this, that
    // call used to just no-op and the edit's dirty note/resource would sit unpushed
    // until something else happened to trigger another sync. Rerun once the current
    // sync finishes instead of dropping it.
    private var syncRerunRequested = false

    fun syncNow(force: Boolean = false) {
        if (_isSyncing.value) {
            syncRerunRequested = true
            return
        }
        viewModelScope.launch {
            _isSyncing.value = true
            _syncError.value = null
            runSync(force = force, allowRelogin = true)
            _isSyncing.value = false
            if (syncRerunRequested) {
                syncRerunRequested = false
                syncNow()
            }
        }
    }

    /** Split out from syncNow so an Unauthorized outcome can trigger one silent
     * re-login + retry (allowRelogin guards against looping if the fresh session is
     * somehow also rejected — e.g. the password changed server-side since we last saved
     * it). Joplin Cloud sessions are fixed at 12 hours with no renewal, so this is the
     * only way to recover without asking the user to type their password in again. */
    private suspend fun runSync(force: Boolean, allowRelogin: Boolean) {
        when (val outcome = syncEngine.sync(force)) {
            is JoplinSyncEngine.SyncOutcome.Success -> loadAll()
            is JoplinSyncEngine.SyncOutcome.Unauthorized -> {
                val account = JoplinAccountStore.shared.account.value
                if (!allowRelogin || account == null) {
                    _syncError.value = "Joplin Cloud session expired — please log in again."
                    return
                }
                JoplinCloudApi.login(account.email, account.password)
                    .onSuccess { session ->
                        JoplinAccountStore.shared.save(
                            account.copy(sessionId = session.id, userId = session.userId)
                        )
                        runSync(force = force, allowRelogin = false)
                    }
                    .onFailure {
                        _syncError.value = "Joplin Cloud session expired — please log in again."
                    }
            }
            is JoplinSyncEngine.SyncOutcome.Failure -> _syncError.value = outcome.message
        }
    }

    fun clearSyncError() {
        _syncError.value = null
    }

    /** Pull-to-refresh entry point — a plain (non-force) sync, but tracked in
     * [isRefreshing] so the pull spinner only reflects refreshes the user asked for,
     * not background pushes. syncNow() is fire-and-forget, so this waits on
     * [isSyncing] to know when to drop the spinner. */
    fun refreshNow() {
        if (_isRefreshing.value) return
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                syncNow()
                // syncNow always flips isSyncing true inside its own launch (even the
                // not-logged-in failure path), so both waits complete.
                _isSyncing.first { it }
                _isSyncing.first { !it }
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    // MARK: - Push debounce

    private var pushDebounceJob: Job? = null

    /** Schedules a push shortly after a local edit, mirroring the editor's own
     * local-save debounce so we're not opening a network request on every keystroke.
     * A no-op when logged out — otherwise every edit before ever logging in would
     * surface a spurious "Not logged in" sync error. */
    private fun schedulePushDebounce() {
        if (JoplinAccountStore.shared.account.value == null) return
        pushDebounceJob?.cancel()
        pushDebounceJob = viewModelScope.launch {
            delay(2000)
            // Re-checked after the delay: a logout during the 2s window would
            // otherwise surface a spurious "Not logged in" sync error.
            if (JoplinAccountStore.shared.account.value == null) return@launch
            syncNow()
        }
    }

    // Restores the previously selected note, falling back to the first note.
    // Only called once at launch — subsequent loadNotes() calls leave selection intact.
    private fun restoreSelection() {
        val current = _notes.value
        if (current.isEmpty()) return
        val saved = prefs.getString(selectedNoteKey, null)
        _selectedNoteId.value = if (saved != null && current.any { it.id == saved }) saved else current.first().id
    }

    // MARK: - Load

    private suspend fun loadAll() {
        _folders.value = withContext(Dispatchers.IO) { db.fetchFolders() }
        _trashedFolders.value = withContext(Dispatchers.IO) { db.fetchTrashedFolders() }
        loadNotes()
    }

    private suspend fun loadNotes() {
        _notes.value = withContext(Dispatchers.IO) {
            val query = _searchText.value
            if (query.isNotEmpty()) db.searchNotes(query) else db.fetchNotes(_selectedFolderId.value)
        }
        // Trashed notes are only visible while Trash is selected — skipping the fetch
        // otherwise avoids loading every trashed note's full body on every call (this
        // runs after each sync, including the 2s-debounced push while typing).
        // selectTrash() re-runs loadNotes(), so the list is always fresh by the time
        // Trash is actually shown.
        if (_isTrashSelected.value) {
            _trashedNotes.value = withContext(Dispatchers.IO) { db.fetchTrashedNotes() }
        }
    }

    // MARK: - Folder actions

    fun selectFolder(folder: Folder?) {
        _isTrashSelected.value = false
        _selectedFolderId.value = folder?.id
        _selectedNoteId.value = null
        prefs.edit().putString(selectedFolderKey, folder?.id).apply()
        viewModelScope.launch { loadNotes() }
    }

    fun selectTrash() {
        _isTrashSelected.value = true
        _selectedFolderId.value = null
        _selectedNoteId.value = null
        // trashedNotes is only kept fresh while Trash is selected (see loadNotes) —
        // refresh it now that it's about to be shown.
        viewModelScope.launch { loadNotes() }
    }

    fun createFolder(title: String = "New Notebook") {
        viewModelScope.launch {
            val folder = Folder(title = title)
            // New folder, never seen by Joplin Cloud yet — dirty so it gets pushed,
            // not synced since the server doesn't know about it.
            withContext(Dispatchers.IO) { db.saveFolder(folder, dirty = true, synced = false) }
            loadAll()
            _selectedFolderId.value = folder.id
            schedulePushDebounce()
        }
    }

    fun renameFolder(folder: Folder, title: String) {
        if (title.isBlank()) return
        viewModelScope.launch {
            val updated = folder.copy(title = title, updatedTime = System.currentTimeMillis())
            withContext(Dispatchers.IO) {
                // Preserve whatever synced state the folder already had — only is_dirty
                // changes here; INSERT OR REPLACE would otherwise reset is_synced to 0.
                val wasSynced = db.folderSyncedFlag(folder.id)
                db.saveFolder(updated, dirty = true, synced = wasSynced)
            }
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Soft delete: moves the notebook and every note inside it to Trash (matches real
     * Joplin's own delete-to-trash behavior). Reversible via restoreFolder() until
     * someone permanently deletes it, or 90 days pass (see purgeExpiredTrash()). */
    fun deleteFolder(folder: Folder) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            withContext(Dispatchers.IO) {
                val wasSynced = db.folderSyncedFlag(folder.id)
                db.saveFolder(folder.copy(deletedTime = now, updatedTime = now), dirty = true, synced = wasSynced)
                for (note in db.fetchNotes(folder.id)) {
                    val noteSynced = db.noteSyncedFlag(note.id)
                    db.saveNote(note.copy(deletedTime = now, updatedTime = now), dirty = true, synced = noteSynced)
                }
            }
            if (_selectedFolderId.value == folder.id) {
                _selectedFolderId.value = null
                _selectedNoteId.value = null
            }
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Un-trashes the notebook and every trashed note inside it. */
    fun restoreFolder(folder: Folder) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            withContext(Dispatchers.IO) {
                val wasSynced = db.folderSyncedFlag(folder.id)
                db.saveFolder(folder.copy(deletedTime = null, updatedTime = now), dirty = true, synced = wasSynced)
                for (note in db.fetchTrashedNotes().filter { it.folderId == folder.id }) {
                    val noteSynced = db.noteSyncedFlag(note.id)
                    db.saveNote(note.copy(deletedTime = null, updatedTime = now), dirty = true, synced = noteSynced)
                }
            }
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Unrecoverable: hard-deletes the notebook, every note inside it, and their
     * resources, queuing remote deletes for anything Joplin Cloud already knew about. */
    fun permanentlyDeleteFolder(folder: Folder) {
        viewModelScope.launch {
            permanentlyDeleteFolderNow(folder)
            if (_selectedFolderId.value == folder.id) {
                _selectedFolderId.value = null
                _selectedNoteId.value = null
            }
            loadAll()
            schedulePushDebounce()
        }
    }

    // MARK: - Note actions

    fun selectNote(note: Note?) {
        _selectedNoteId.value = note?.id
        prefs.edit().putString(selectedNoteKey, note?.id).apply()
    }

    /**
     * onCreated fires once the note is saved and selected — callers on compact-width
     * screens use it to navigate straight into the editor (see NoteListScreen's
     * onNewNote/EmptyState), instead of leaving the user to find the new note in the
     * list and tap it. Two-pane (wide) callers can ignore it — the editor pane already
     * shows the newly-selected note reactively.
     */
    fun createNote(onCreated: (Note) -> Unit = {}) {
        viewModelScope.launch {
            // Joplin has no "notebook-less note" concept — every real client always
            // resolves to a concrete folder id before saving. A note pushed with
            // parent_id = "" (which is what "All Notes" selected means locally) doesn't
            // show up in Joplin's per-notebook views. Fall back to an existing folder,
            // or create one, rather than ever pushing an empty parent_id.
            val folderId = _selectedFolderId.value ?: withContext(Dispatchers.IO) { ensureAnyFolder() }
            // No placeholder title: a new note opens empty, showing the editor's own
            // "Title" placeholder with the cursor already in it, so the first thing
            // typed is the title. The note list shows "Untitled" until there is one.
            val note = Note(folderId = folderId, title = "", body = "")
            // New note, never seen by Joplin Cloud yet — dirty so it gets pushed, not
            // synced since the server doesn't know about it.
            withContext(Dispatchers.IO) { db.saveNote(note, dirty = true, synced = false) }
            loadAll()
            _selectedNoteId.value = note.id
            prefs.edit().putString(selectedNoteKey, note.id).apply()
            // Open the new note directly in edit mode (see pendingEditNoteId). Set
            // before onCreated so it's in place by the time the editor composes.
            _pendingEditNoteId.value = note.id
            schedulePushDebounce()
            onCreated(note)
        }
    }

    /** Returns an existing folder's id, or creates a default one if there are none. */
    private fun ensureAnyFolder(): String {
        db.fetchFolders().firstOrNull()?.let { return it.id }
        val folder = Folder(title = "Notes")
        db.saveFolder(folder, dirty = true, synced = false)
        return folder.id
    }

    fun saveNote(note: Note) {
        viewModelScope.launch {
            val previousBody = _notes.value.firstOrNull { it.id == note.id }?.body
            val updated = note.copy(updatedTime = System.currentTimeMillis())
            withContext(Dispatchers.IO) {
                // Preserve whatever synced state the note already had — only is_dirty
                // changes here; INSERT OR REPLACE would otherwise reset is_synced to 0.
                val wasSynced = db.noteSyncedFlag(note.id)
                db.saveNote(updated, dirty = true, synced = wasSynced)
                // An image removed from the body (but the note itself kept) leaves an
                // orphaned resource behind — clean it up the same way a deleted note's
                // resources are cleaned up below. The regex scan runs over both full
                // bodies, so the cheap contains() pre-check skips it entirely for
                // image-less notes — this runs on every editor save (i.e. while typing).
                if (previousBody != null &&
                    (previousBody.contains("data-resource-id") || updated.body.contains("data-resource-id"))
                ) {
                    unlinkRemovedResources(note.id, previousBody, updated.body)
                }
            }
            // Update the one changed row in place instead of re-fetching the whole
            // folder (which loaded every note's full body per editor save, and also
            // silently replaced active search results with the unfiltered folder
            // list). The list deliberately keeps its current order while editing —
            // it re-sorts by updated_time on the next loadNotes() (folder switch,
            // sync, launch), so the row being edited doesn't jump around mid-typing.
            val current = _notes.value
            if (current.any { it.id == updated.id }) {
                _notes.value = current.map { if (it.id == updated.id) updated else it }
            } else if (_trashedNotes.value.any { it.id == updated.id }) {
                _trashedNotes.value = _trashedNotes.value.map { if (it.id == updated.id) updated else it }
            } else {
                loadNotes()
            }
            schedulePushDebounce()
        }
    }

    /**
     * Editor save path — looks the note up fresh by id instead of trusting a Note the
     * caller captured when the editor opened. The editor's content-changed callback
     * used to hold that stale snapshot for the whole editing session, so any change
     * made elsewhere meanwhile (pin/unpin from the list, a folder move, a sync pull)
     * was silently reverted to the snapshot's values on the next keystroke-save —
     * exactly the kind of stale state that only a restart used to clear.
     */
    fun saveNoteContent(noteId: String, title: String, body: String) {
        viewModelScope.launch {
            val existing = _notes.value.firstOrNull { it.id == noteId }
                ?: _trashedNotes.value.firstOrNull { it.id == noteId }
                ?: withContext(Dispatchers.IO) { db.fetchNote(noteId) }
                ?: return@launch
            saveNote(existing.copy(title = title, body = body))
        }
    }

    /** Soft delete: moves the note to Trash (matches real Joplin's own delete-to-trash
     * behavior). Reversible via restoreNote() until someone permanently deletes it, or
     * 90 days pass (see purgeExpiredTrash()). Resources are left alone — they're only
     * cleaned up once the note is actually gone for good. */
    fun deleteNote(note: Note) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val wasSynced = db.noteSyncedFlag(note.id)
                val now = System.currentTimeMillis()
                db.saveNote(note.copy(deletedTime = now, updatedTime = now), dirty = true, synced = wasSynced)
            }
            if (_selectedNoteId.value == note.id) _selectedNoteId.value = null
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Un-trashes the note, leaving its notebook assignment untouched. */
    fun restoreNote(note: Note) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val wasSynced = db.noteSyncedFlag(note.id)
                db.saveNote(note.copy(deletedTime = null, updatedTime = System.currentTimeMillis()), dirty = true, synced = wasSynced)
            }
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Toggles the note's pinned state (see Note.isPinned's doc comment on how this
     * syncs via application_data). */
    fun togglePin(note: Note) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                val wasSynced = db.noteSyncedFlag(note.id)
                db.saveNote(
                    note.copy(isPinned = !note.isPinned, updatedTime = System.currentTimeMillis()),
                    dirty = true,
                    synced = wasSynced,
                )
            }
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Unrecoverable: hard-deletes the note and cleans up any resources it referenced
     * that no other note still links to, queuing a remote delete for anything Joplin
     * Cloud already knew about. */
    fun permanentlyDeleteNote(note: Note) {
        viewModelScope.launch {
            permanentlyDeleteNoteNow(note)
            if (_selectedNoteId.value == note.id) _selectedNoteId.value = null
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Permanently deletes everything currently in Trash — notebooks first (each one
     * cascades its own notes), then any note trashed individually whose notebook wasn't. */
    fun emptyTrash() {
        viewModelScope.launch {
            for (folder in _trashedFolders.value) permanentlyDeleteFolderNow(folder)
            val remaining = withContext(Dispatchers.IO) { db.fetchTrashedNotes() }
            for (note in remaining) permanentlyDeleteNoteNow(note)
            _selectedNoteId.value = null
            loadAll()
            schedulePushDebounce()
        }
    }

    /** Sweeps Trash for anything past the 90-day retention window and permanently
     * deletes it — mirrors Joplin's own default auto-purge. Runs once at launch,
     * before the first sync (see init), so a stale trashed item doesn't sit around
     * forever just because the app wasn't opened for a while. */
    private suspend fun purgeExpiredTrash() {
        val cutoff = System.currentTimeMillis() - TRASH_RETENTION_MILLIS
        for (folder in db.fetchTrashedFolders()) {
            val deletedTime = folder.deletedTime ?: continue
            if (deletedTime < cutoff) permanentlyDeleteFolderNow(folder)
        }
        for (note in db.fetchTrashedNotes()) {
            val deletedTime = note.deletedTime ?: continue
            if (deletedTime < cutoff) permanentlyDeleteNoteNow(note)
        }
    }

    /** Synchronous IO-thread core shared by permanentlyDeleteFolder/emptyTrash/purge —
     * the public permanentlyDeleteFolder() wraps this with UI-state cleanup. */
    private suspend fun permanentlyDeleteFolderNow(folder: Folder) = withContext(Dispatchers.IO) {
        if (db.folderSyncedFlag(folder.id)) db.queueDelete(folder.id, "folder")
        val notesInFolder = db.fetchNotes(folder.id) + db.fetchTrashedNotes().filter { it.folderId == folder.id }
        for (note in notesInFolder.distinctBy { it.id }) {
            if (db.noteSyncedFlag(note.id)) db.queueDelete(note.id, "note")
            unlinkRemovedResources(note.id, note.body, "")
        }
        db.deleteFolder(folder.id)
    }

    /** Synchronous IO-thread core shared by permanentlyDeleteNote/emptyTrash/purge. */
    private suspend fun permanentlyDeleteNoteNow(note: Note) = withContext(Dispatchers.IO) {
        if (db.noteSyncedFlag(note.id)) db.queueDelete(note.id, "note")
        db.deleteNote(note.id)
        unlinkRemovedResources(note.id, note.body, "")
    }

    private val resourceIdRegex = Regex("data-resource-id=\"([0-9a-fA-F]{32})\"")

    private fun extractResourceIds(html: String): Set<String> =
        resourceIdRegex.findAll(html).map { it.groupValues[1] }.toSet()

    /** Unlinks any resource referenced in [oldBody] but not [newBody] from [noteId], and
     * if that leaves the resource unreferenced by any note, deletes it locally and queues
     * a remote delete if Joplin Cloud already knew about it. Called with newBody = "" to
     * cascade every resource a deleted note referenced. */
    private fun unlinkRemovedResources(noteId: String, oldBody: String, newBody: String) {
        val removed = extractResourceIds(oldBody) - extractResourceIds(newBody)
        for (resourceId in removed) {
            db.unlinkNoteResource(noteId, resourceId)
            if (!db.isResourceReferenced(resourceId)) {
                if (db.resourceSyncedFlag(resourceId)) db.queueDelete(resourceId, "resource")
                db.deleteResource(resourceId)
            }
        }
    }

    // MARK: - Search

    private var searchJob: Job? = null

    // The actual query is debounced and single-flight: searchNotes is an unindexed
    // LIKE scan over every note's title and full body, so launching one per keystroke
    // queued overlapping full-table scans whose completions could land out of order
    // (an older query's results overwriting a newer one's). Cancelling the previous
    // job fixes the race; the 250ms debounce fixes the cost. Clearing refreshes
    // immediately (fetchNotes by folder is cheap and it feels snappier).
    fun search(query: String) {
        _searchText.value = query
        searchJob?.cancel()
        if (query.isEmpty()) {
            searchJob = viewModelScope.launch { loadNotes() }
            return
        }
        searchJob = viewModelScope.launch {
            delay(250)
            loadNotes()
        }
    }

    fun clearSearch() {
        _searchText.value = ""
        searchJob?.cancel()
        searchJob = viewModelScope.launch { loadNotes() }
    }

    // MARK: - Search focus request (Ctrl+F parity — see NotesTNApp.swift Find… command)

    fun requestFocusSearch() {
        _isFocusingSearch.value = true
    }

    fun consumeFocusSearch() {
        _isFocusingSearch.value = false
    }

    /** Cleared by the editor after it has applied the open-in-edit-mode signal (see
     * pendingEditNoteId), so re-opening the same note later starts in read mode. */
    fun consumePendingEdit() {
        _pendingEditNoteId.value = null
    }

    companion object {
        // Matches Joplin's own default trash retention period.
        private const val TRASH_RETENTION_MILLIS = 90L * 24 * 60 * 60 * 1000
    }
}
