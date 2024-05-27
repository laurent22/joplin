import { useState, useEffect, useCallback, RefObject, useRef } from 'react';
import { FormNote, defaultFormNote, ResourceInfos } from './types';
import { clearResourceCache, attachedResources } from './resourceHandling';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import { handleResourceDownloadMode } from './resourceHandling';
import { splitHtml } from '@joplin/renderer/HtmlToHtml';
import Setting from '@joplin/lib/models/Setting';
import usePrevious from '../../hooks/usePrevious';
import ResourceEditWatcher from '@joplin/lib/services/ResourceEditWatcher/index';

import { MarkupToHtml } from '@joplin/renderer';
import Note from '@joplin/lib/models/Note';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { focus } from '@joplin/lib/utils/focusHandler';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useFormNote');

export interface OnLoadEvent {
	formNote: FormNote;
}

export interface HookDependencies {
	syncStarted: boolean;
	decryptionStarted: boolean;
	noteId: string;
	isProvisional: boolean;
	titleInputRef: RefObject<HTMLInputElement>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	editorRef: any;
	onBeforeLoad(event: OnLoadEvent): void;
	onAfterLoad(event: OnLoadEvent): void;
}

type MapFormNoteCallback = (previousFormNote: FormNote)=> FormNote;
export type OnSetFormNote = (newFormNote: FormNote|MapFormNoteCallback)=> void;

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function installResourceChangeHandler(onResourceChangeHandler: Function) {
	ResourceFetcher.instance().on('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().on('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().on('resourceDecrypted', onResourceChangeHandler);
	ResourceEditWatcher.instance().on('resourceChange', onResourceChangeHandler);
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function uninstallResourceChangeHandler(onResourceChangeHandler: Function) {
	ResourceFetcher.instance().off('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().off('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().off('resourceDecrypted', onResourceChangeHandler);
	ResourceEditWatcher.instance().off('resourceChange', onResourceChangeHandler);
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

export default function useFormNote(dependencies: HookDependencies) {
	const {
		syncStarted, decryptionStarted, noteId, isProvisional, titleInputRef, editorRef, onBeforeLoad, onAfterLoad,
	} = dependencies;

	const [formNote, setFormNote] = useState<FormNote>(defaultFormNote());
	const [isNewNote, setIsNewNote] = useState(false);
	const prevSyncStarted = usePrevious(syncStarted);
	const prevDecryptionStarted = usePrevious(decryptionStarted);
	const previousNoteId = usePrevious(formNote.id);
	const [resourceInfos, setResourceInfos] = useState<ResourceInfos>({});

	const formNoteRef = useRef(formNote);
	formNoteRef.current = formNote;

	// Increasing the value of this counter cancels any ongoing note refreshes and starts
	// a new refresh.
	const [formNoteRefreshScheduled, setFormNoteRefreshScheduled] = useState<number>(0);

	const initNoteState = useCallback(async (n: NoteEntity, isNewNote: boolean) => {
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
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			markup_language: n.markup_language,
			saveActionQueue: new AsyncActionQueue(300),
			originalCss: originalCss,
			hasChanged: false,
			user_updated_time: n.user_updated_time,
			encryption_applied: n.encryption_applied,
		};

		logger.debug('Initializing note state');

		// Note that for performance reason,the call to setResourceInfos should
		// be first because it loads the resource infos in an async way. If we
		// swap them, the formNote will be updated first and rendered, then the
		// the resources will load, and the note will be re-rendered.
		const resources = await attachedResources(n.body);

		// If the user changes the note while resources are loading, this can lead to
		// a note being incorrectly marked as "unchanged".
		if (!isNewNote && formNoteRef.current?.hasChanged) {
			logger.info('Cancelled note refresh -- form note changed while loading attached resources.');
			return null;
		}

		setResourceInfos(resources);
		setFormNote(newFormNote);

		logger.debug('Resource info and form note set.');

		await handleResourceDownloadMode(n.body);

		return newFormNote;
	}, []);

	useEffect(() => {
		if (formNoteRefreshScheduled <= 0) return () => {};
		if (formNoteRef.current.hasChanged) {
			logger.info('Form note changed between scheduling a refresh and the refresh itself. Cancelling the refresh.');
			return () => {};
		}

		logger.info('Sync has finished and note has never been changed - reloading it');

		let cancelled = false;

		const loadNote = async () => {
			const n = await Note.load(noteId);
			if (cancelled) return;

			// Normally should not happened because if the note has been deleted via sync
			// it would not have been loaded in the editor (due to note selection changing
			// on delete)
			if (!n) {
				logger.warn('Trying to reload note that has been deleted:', noteId);
				return;
			}

			await initNoteState(n, false);

			setFormNoteRefreshScheduled(0);
		};

		void loadNote();

		return () => {
			cancelled = true;
		};
	}, [formNoteRefreshScheduled, noteId, initNoteState]);

	const refreshFormNote = useCallback(() => {
		// Increase the counter to cancel any ongoing refresh attempts
		// and start a new one.
		setFormNoteRefreshScheduled(formNoteRefreshScheduled + 1);
	}, [formNoteRefreshScheduled]);

	useEffect(() => {
		// Check that synchronisation has just finished - and
		// if the note has never been changed, we reload it.
		// If the note has already been changed, it's a conflict
		// that's already been handled by the synchronizer.
		const decryptionJustEnded = prevDecryptionStarted && !decryptionStarted;
		const syncJustEnded = prevSyncStarted && !syncStarted;

		if (!decryptionJustEnded && !syncJustEnded) return;
		if (formNoteRef.current.hasChanged) return;

		logger.debug('Sync or decryption finished with an unchanged formNote.');

		// Refresh the form note.
		// This is kept separate from the above logic so that when prevSyncStarted is changed
		// from true to false, it doesn't cancel the note from loading.
		refreshFormNote();
	}, [
		prevSyncStarted, syncStarted,
		prevDecryptionStarted, decryptionStarted,
		refreshFormNote,
	]);

	useEffect(() => {
		if (!noteId) {
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
					if (editorRef.current) editorRef.current.execCommand({ name: 'editor.focus' });
				}
			});
		}

		async function loadNote() {
			const n = await Note.load(noteId);
			if (cancelled) return;
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onResourceChange = useCallback(async (event: any = null) => {
		const resourceIds = await Note.linkedResourceIds(formNote.body);
		if (!event || resourceIds.indexOf(event.id) >= 0) {
			clearResourceCache();
			setResourceInfos(await attachedResources(formNote.body));
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
		if (typeof newFormNote === 'function') {
			const newNote = newFormNote(formNoteRef.current);
			formNoteRef.current = newNote;
			setFormNote(newNote);
		} else {
			formNoteRef.current = newFormNote;
			setFormNote(newFormNote);
		}
	}, [setFormNote]);

	return {
		isNewNote,
		formNote,
		setFormNote: onSetFormNote,
		resourceInfos,
	};
}
