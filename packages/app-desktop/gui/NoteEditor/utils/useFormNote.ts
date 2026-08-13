import { useState, useEffect, useCallback, RefObject, useRef } from 'react';
import { FormNote, defaultFormNote, NoteBodyEditorRef, ResourceInfos } from './types';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import { handleResourceDownloadMode } from './resourceHandling';
import { splitHtml } from '@joplin/renderer/HtmlToHtml';
import Setting from '@joplin/lib/models/Setting';
import usePrevious from '../../hooks/usePrevious';
import attachedResources, { clearResourceCache } from '@joplin/lib/utils/attachedResources';
import { MarkupToHtml } from '@joplin/renderer';
import Note from '@joplin/lib/models/Note';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import { focus } from '@joplin/lib/utils/focusHandler';
import Logger from '@joplin/utils/Logger';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { NoteEntity } from '@joplin/lib/services/database/types';
import NoteLockNote from '@joplin/lib/services/noteLock/NoteLockNote';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';

const logger = Logger.create('useFormNote');

export interface OnLoadEvent {
	formNote: FormNote;
}

export interface HookDependencies {
	noteId: string;
	editorId: string;
	isProvisional: boolean;
	titleInputRef: RefObject<HTMLInputElement>;
	editorRef: RefObject<NoteBodyEditorRef>;
	onBeforeLoad(event: OnLoadEvent): void;
	onAfterLoad(event: OnLoadEvent): void;
	builtInEditorVisible: boolean;
	noteLockSessionUnlocked: boolean;
	onDecryptFailedChange(value: boolean): void;
	onReloadInProgressChange?(value: boolean): void;
	editorNoteReloadTimeRequest?: number;
}

type MapFormNoteCallback = (previousFormNote: FormNote)=> FormNote;
export type OnSetFormNote = (newFormNote: FormNote|MapFormNoteCallback)=> void;

function installResourceChangeHandler(onResourceChangeHandler: ()=> void) {
	ResourceFetcher.instance().on('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().on('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().on('resourceDecrypted', onResourceChangeHandler);
	eventManager.on(EventName.ResourceChange, onResourceChangeHandler);
}

function uninstallResourceChangeHandler(onResourceChangeHandler: ()=> void) {
	ResourceFetcher.instance().off('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().off('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().off('resourceDecrypted', onResourceChangeHandler);
	eventManager.off(EventName.ResourceChange, onResourceChangeHandler);
}

function resourceInfosChanged(a: ResourceInfos, b: ResourceInfos): boolean {
	if (Object.keys(a).length !== Object.keys(b).length) return true;

	for (const id in a) {
		const r1 = a[id];
		const r2 = b[id];
		if (!r2) return true;
		if (r1.item.updated_time !== r2.item.updated_time) return true;
		if (r1.item.encryption_applied !== r2.item.encryption_applied) return true;
		if (r1.item.is_shared !== r2.item.is_shared) return true;
		if (r1.localState.fetch_status !== r2.localState.fetch_status) return true;
	}

	return false;
}

// While the session is locked, a locked note produces no form note at all - the unlock panel
// takes the editor's place. So no placeholder body exists that a save could write over the note.
const loadNoteForForm = async (noteId: string): Promise<{ note: NoteEntity|null; blocked: boolean; decryptFailed: boolean }> => {
	if (isNoteLockEnabled()) {
		const lockState = await Note.load(noteId, { fields: ['is_locked'] });
		if (lockState && NoteLockNote.isLocked(lockState)) {
			if (!NoteLockSession.instance().isUnlocked()) return { note: null, blocked: true, decryptFailed: false };
			try {
				return { note: await Note.load(noteId, { useNoteLock: true }), blocked: false, decryptFailed: false };
			} catch (error) {
				// Happens when the note was encrypted with a different key, e.g. before a password
				// reset. Fail closed and let the editor show the cannot-decrypt panel.
				logger.warn('Could not decrypt locked note:', noteId, error);
				return { note: null, blocked: false, decryptFailed: true };
			}
		}
	}
	return { note: await Note.load(noteId), blocked: false, decryptFailed: false };
};

type InitNoteStateCallback = (note: NoteEntity, isNew: boolean, force?: boolean)=> Promise<FormNote>;
const useRefreshFormNoteOnChange = (formNoteRef: RefObject<FormNote>, editorId: string, noteId: string, initNoteState: InitNoteStateCallback, clearFormNote: ()=> void, builtInEditorVisible: boolean, noteLockSessionUnlocked: boolean, setDecryptFailed: (value: boolean)=> void, setLoadBlocked: (value: boolean)=> void, onReloadInProgressChange: (value: boolean)=> void, editorNoteReloadTimeRequest: number) => {
	// Increasing the value of this counter cancels any ongoing note refreshes and starts
	// a new refresh.
	const [formNoteRefreshRequest, setFormNoteRefreshRequest] = useState({ counter: 0, force: false });
	const previousEditorNoteReloadTimeRequestRef = useRef(editorNoteReloadTimeRequest);
	const editorNoteReloadTimeRequestRef = useRef(editorNoteReloadTimeRequest);
	editorNoteReloadTimeRequestRef.current = editorNoteReloadTimeRequest;
	const prevBuiltInEditorVisible = usePrevious<boolean>(builtInEditorVisible);
	// Seeded because usePrevious defaults to null, which would read as a session change on mount.
	const prevNoteLockSessionUnlocked = usePrevious<boolean>(noteLockSessionUnlocked, noteLockSessionUnlocked);

	useQueuedAsyncEffect(async (event) => {
		if (formNoteRefreshRequest.counter <= 0) return;
		const forceRefresh = formNoteRefreshRequest.force;
		if (formNoteRef.current.hasChanged && !forceRefresh) {
			logger.info('Form note changed between scheduling a refresh and the refresh itself. Cancelling the refresh.');
			onReloadInProgressChange(false);
			return;
		}

		logger.info('Sync has finished and note has never been changed - reloading it');

		const loadNote = async () => {
			setDecryptFailed(false);
			const { note: n, blocked, decryptFailed } = await loadNoteForForm(noteId);
			if (event.cancelled || (formNoteRef.current.hasChanged && !forceRefresh)) return;

			setLoadBlocked(blocked);
			setDecryptFailed(decryptFailed);
			if (blocked || decryptFailed) {
				// The session locked with this note open (or its content stopped decrypting) - drop
				// the decrypted content and let the corresponding panel take over.
				if (formNoteRef.current.id) clearFormNote();
			} else {
				// Normally should not happened because if the note has been deleted via sync
				// it would not have been loaded in the editor (due to note selection changing
				// on delete)
				if (!n) {
					logger.warn('Trying to reload note that has been deleted:', noteId);
					return;
				}

				await initNoteState(n, false, forceRefresh);
				if (event.cancelled) return;
			}
			setFormNoteRefreshRequest(oldValue => {
				// If a new refresh was scheduled between initNoteState
				// and now:
				if (oldValue.counter !== formNoteRefreshRequest.counter) {
					return oldValue;
				}
				// A refresh is no longer scheduled
				return { counter: 0, force: false };
			});
		};

		try {
			await loadNote();
		} finally {
			if (!event.cancelled) onReloadInProgressChange(false);
		}
	}, [formNoteRefreshRequest, noteId, editorId, initNoteState, clearFormNote, setDecryptFailed, onReloadInProgressChange]);

	const refreshFormNote = useCallback((force = false) => {
		// Increase the counter to cancel any ongoing refresh attempts
		// and start a new one.
		onReloadInProgressChange(true);
		setFormNoteRefreshRequest(previous => ({ counter: previous.counter + 1, force: previous.force || force }));
	}, [onReloadInProgressChange]);

	useEffect(() => {
		if (editorNoteReloadTimeRequest === previousEditorNoteReloadTimeRequestRef.current) return;
		previousEditorNoteReloadTimeRequestRef.current = editorNoteReloadTimeRequest;
		refreshFormNote(true);
	}, [editorNoteReloadTimeRequest, refreshFormNote]);

	// When switching from the plugin editor to the built-in editor, we refresh the note since the
	// plugin may have modified it via the data API.
	useEffect(() => {
		if (prevBuiltInEditorVisible !== builtInEditorVisible && builtInEditorVisible) {
			refreshFormNote();
		}
	}, [builtInEditorVisible, prevBuiltInEditorVisible, refreshFormNote]);

	// Unlocking loads the note the panel was blocking (the form is then empty), locking must drop
	// a locked note's plaintext - reload to recompute.
	useEffect(() => {
		if (isNoteLockEnabled() && prevNoteLockSessionUnlocked !== noteLockSessionUnlocked && (formNoteRef.current.is_locked || formNoteRef.current.id !== noteId)) {
			refreshFormNote();
		}
	}, [noteLockSessionUnlocked, prevNoteLockSessionUnlocked, noteId, formNoteRef, refreshFormNote]);


	useEffect(() => {
		if (!noteId) return ()=>{};

		let cancelled = false;
		let itemChangeRefreshTimeout: ReturnType<typeof setTimeout>|null = null;

		type ChangeEventSlice = { itemId: string; changeId: string };
		const listener = ({ itemId, changeId }: ChangeEventSlice) => {
			// If this change came from the current editor, it should already be
			// handled by calls to `setFormNote`. If events from the current editor
			// aren't ignored, most user-activated note changes (e.g. a keypress)
			// cause the note to refresh. (Undesired refreshes can cause the cursor to jump).
			const isExternalChange = !(changeId ?? 'unknown').endsWith(editorId);
			if (itemId !== noteId || cancelled || !isExternalChange) return;

			const reloadRequestAtChange = editorNoteReloadTimeRequestRef.current;
			if (itemChangeRefreshTimeout) clearTimeout(itemChangeRefreshTimeout);
			// A sync save emits ItemChange just before it dispatches EDITOR_NOTE_NEEDS_RELOAD.
			// Yield one task so the reload request can reach this editor first. If its token
			// changes, the tokened reload handles the update and this generic refresh is skipped.
			// For other external changes the token remains unchanged, so the refresh proceeds.
			itemChangeRefreshTimeout = setTimeout(() => {
				itemChangeRefreshTimeout = null;
				if (cancelled || editorNoteReloadTimeRequestRef.current !== reloadRequestAtChange) return;
				if (formNoteRef.current.hasChanged) return;
				refreshFormNote();
			}, 0);
		};
		eventManager.on(EventName.ItemChange, listener);

		return () => {
			eventManager.off(EventName.ItemChange, listener);
			cancelled = true;
			if (itemChangeRefreshTimeout) clearTimeout(itemChangeRefreshTimeout);
		};
	}, [formNoteRef, noteId, editorId, refreshFormNote]);
};

export default function useFormNote(dependencies: HookDependencies) {
	const {
		noteId, isProvisional, titleInputRef, editorRef, onBeforeLoad, onAfterLoad, builtInEditorVisible, editorId, noteLockSessionUnlocked, onDecryptFailedChange,
	} = dependencies;
	const onReloadInProgressChange = dependencies.onReloadInProgressChange ?? (() => {});
	const editorNoteReloadTimeRequest = dependencies.editorNoteReloadTimeRequest ?? 0;

	const [formNote, setFormNote] = useState<FormNote>(defaultFormNote());
	const [isNewNote, setIsNewNote] = useState(false);
	// Keyed by note id so a failure can never carry over to another note the user switches to.
	const [decryptFailedId, setDecryptFailedId] = useState<string|null>(null);
	const setDecryptFailed = useCallback((value: boolean) => {
		setDecryptFailedId(value ? noteId : null);
		onDecryptFailedChange(value);
	}, [noteId, onDecryptFailedChange]);
	const [loadBlockedId, setLoadBlockedId] = useState<string|null>(null);
	const setLoadBlocked = useCallback((value: boolean) => setLoadBlockedId(value ? noteId : null), [noteId]);
	const previousNoteId = usePrevious(formNote.id);
	const [resourceInfos, setResourceInfos] = useState<ResourceInfos>({});

	const formNoteRef = useRef(formNote);
	formNoteRef.current = formNote;

	const initNoteState: InitNoteStateCallback = useCallback(async (n, isNewNote, force = false) => {
		let noteLockKey = null;
		if (isNoteLockEnabled() && NoteLockNote.isLocked(n)) {
			// The session can lock between the gated load and here (e.g. lock-on-switch) - drop
			// the load rather than show plaintext that pending saves could no longer encrypt.
			if (!NoteLockSession.instance().isUnlocked()) return null;
			// Capture the key with the plaintext so pending saves can re-encrypt even after
			// the session locks.
			noteLockKey = NoteLockSession.instance().decryptedKey();
		}

		let originalCss = '';

		if (n.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			const splitted = splitHtml(n.body);
			originalCss = splitted.css;
		}

		const newFormNote = {
			id: n.id,
			title: n.title,
			body: n.body,
			is_todo: n.is_todo,
			parent_id: n.parent_id,
			deleted_time: n.deleted_time,
			is_conflict: n.is_conflict,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			markup_language: n.markup_language,
			saveActionQueue: new AsyncActionQueue(300),
			originalCss: originalCss,
			hasChanged: false,
			user_updated_time: n.user_updated_time,
			encryption_applied: n.encryption_applied,
			is_locked: n.is_locked,
			noteLockKey,
			isDecrypted: 'isDecrypted' in n && !!n.isDecrypted,
		};

		logger.debug('Initializing note state');

		// Note that for performance reason,the call to setResourceInfos should
		// be first because it loads the resource infos in an async way. If we
		// swap them, the formNote will be updated first and rendered, then the
		// the resources will load, and the note will be re-rendered.
		const resources = await attachedResources(n.body);

		// If the user changes the note while resources are loading, this can lead to
		// a note being incorrectly marked as "unchanged".
		if (!isNewNote && formNoteRef.current?.hasChanged && !force) {
			logger.info('Cancelled note refresh -- form note changed while loading attached resources.');
			return null;
		}
		setResourceInfos(resources);
		setFormNote(newFormNote);
		formNoteRef.current = newFormNote;

		logger.debug('Resource info and form note set.');

		await handleResourceDownloadMode(n.body);

		return newFormNote;
	}, []);

	const clearFormNote = useCallback(() => {
		formNoteRef.current = defaultFormNote();
		setFormNote(formNoteRef.current);
	}, []);

	useRefreshFormNoteOnChange(formNoteRef, editorId, noteId, initNoteState, clearFormNote, builtInEditorVisible, noteLockSessionUnlocked, setDecryptFailed, setLoadBlocked, onReloadInProgressChange, editorNoteReloadTimeRequest);

	useEffect(() => {
		if (!noteId) {
			setDecryptFailed(false);
			if (formNote.id) setFormNote(defaultFormNote());
			return () => {};
		}

		if (formNote.id === noteId) return () => {};

		let cancelled = false;

		logger.debug('Loading existing note', noteId);

		function handleAutoFocus(noteIsTodo: boolean) {
			if (!isProvisional) return;

			const focusSettingName = noteIsTodo ? 'newTodoFocus' : 'newNoteFocus';

			requestAnimationFrame(() => {
				if (Setting.value(focusSettingName) === 'title') {
					if (titleInputRef.current) focus('useFormNote::handleAutoFocus', titleInputRef.current);
				} else {
					if (editorRef.current) void editorRef.current.execCommand({ name: 'editor.focus' });
				}
			});
		}

		async function loadNote() {
			setDecryptFailed(false);
			const { note: n, blocked, decryptFailed } = await loadNoteForForm(noteId);
			if (cancelled) return;

			setLoadBlocked(blocked);
			setDecryptFailed(decryptFailed);
			if (blocked || decryptFailed) {
				await onBeforeLoad({ formNote });
				if (cancelled) return;
				// Drop the previous form so no note content lingers behind the unlock or
				// cannot-decrypt panel. The id guard stops the resulting effect re-run from looping.
				if (formNoteRef.current.id) clearFormNote();
				return;
			}

			if (!n) throw new Error(`Cannot find note with ID: ${noteId}`);
			logger.debug('Loaded note:', n);

			await onBeforeLoad({ formNote });

			const newFormNote = await initNoteState(n, true);

			setIsNewNote(isProvisional);

			await onAfterLoad({ formNote: newFormNote });

			handleAutoFocus(!!n.is_todo);
		}

		void loadNote();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [noteId, isProvisional, formNote]);

	const onResourceChange = useCallback(async (event: { id: string } = null) => {
		const resourceIds = await Note.linkedResourceIds(formNote.body);
		if (!event || resourceIds.indexOf(event.id) >= 0) {
			clearResourceCache();
			const newResourceInfos = await attachedResources(formNote.body);
			setResourceInfos(newResourceInfos);
		}
	}, [formNote.body]);

	useEffect(() => {
		installResourceChangeHandler(onResourceChange);
		return () => {
			uninstallResourceChangeHandler(onResourceChange);
		};
	}, [onResourceChange]);

	useEffect(() => {
		if (previousNoteId !== formNote.id) {
			void onResourceChange();
		}
	}, [previousNoteId, formNote.id, onResourceChange]);

	useEffect(() => {
		let cancelled = false;

		async function runEffect() {
			const r = await attachedResources(formNote.body);
			if (cancelled) return;
			setResourceInfos((previous: ResourceInfos) => {
				return resourceInfosChanged(previous, r) ? r : previous;
			});
		}

		void runEffect();

		return () => {
			cancelled = true;
		};
	}, [formNote.body]);

	// Currently, useFormNote relies on formNoteRef being up-to-date immediately after the editor
	// changes, with no delay during which async code can run. Even a small delay (e.g. that introduced
	// by a setState -> useEffect) can lead to a race condition. See https://github.com/laurent22/joplin/issues/8960.
	const onSetFormNote: OnSetFormNote = useCallback(newFormNote => {
		let newNote;
		if (typeof newFormNote === 'function') {
			newNote = newFormNote(formNoteRef.current);
		} else {
			newNote = newFormNote;
		}
		formNoteRef.current = newNote;
		setFormNote(newNote);
	}, [setFormNote]);

	return {
		isNewNote,
		formNote,
		setFormNote: onSetFormNote,
		resourceInfos,
		decryptFailed: !!noteId && decryptFailedId === noteId,
		loadBlocked: !!noteId && loadBlockedId === noteId,
	};
}
