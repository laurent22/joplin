import { useState, useEffect, useCallback } from 'react';
import { FormNote, defaultFormNote, ResourceInfos } from './types';
import { clearResourceCache, attachedResources } from './resourceHandling';
import AsyncActionQueue from '../../../lib/AsyncActionQueue';
import { handleResourceDownloadMode } from './resourceHandling';
const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToHtml = require('lib/joplin-renderer/HtmlToHtml');
const usePrevious = require('lib/hooks/usePrevious').default;
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const { reg } = require('lib/registry.js');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const ResourceEditWatcher = require('lib/services/ResourceEditWatcher/index').default;

export interface OnLoadEvent {
	formNote: FormNote,
}

interface HookDependencies {
	syncStarted: boolean,
	noteId: string,
	isProvisional: boolean,
	titleInputRef: any,
	editorRef: any,
	onBeforeLoad(event:OnLoadEvent):void,
	onAfterLoad(event:OnLoadEvent):void,
}

function installResourceChangeHandler(onResourceChangeHandler: Function) {
	ResourceFetcher.instance().on('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().on('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().on('resourceDecrypted', onResourceChangeHandler);
	ResourceEditWatcher.instance().on('resourceChange', onResourceChangeHandler);
}

function uninstallResourceChangeHandler(onResourceChangeHandler: Function) {
	ResourceFetcher.instance().off('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().off('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().off('resourceDecrypted', onResourceChangeHandler);
	ResourceEditWatcher.instance().off('resourceChange', onResourceChangeHandler);
}

function resourceInfosChanged(a:ResourceInfos, b:ResourceInfos):boolean {
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

export default function useFormNote(dependencies:HookDependencies) {
	const { syncStarted, noteId, isProvisional, titleInputRef, editorRef, onBeforeLoad, onAfterLoad } = dependencies;

	const [formNote, setFormNote] = useState<FormNote>(defaultFormNote());
	const [isNewNote, setIsNewNote] = useState(false);
	const prevSyncStarted = usePrevious(syncStarted);
	const previousNoteId = usePrevious(formNote.id);
	const [resourceInfos, setResourceInfos] = useState<ResourceInfos>({});

	async function initNoteState(n: any) {
		let originalCss = '';

		if (n.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			const htmlToHtml = new HtmlToHtml();
			const splitted = htmlToHtml.splitHtml(n.body);
			originalCss = splitted.css;
		}

		const newFormNote = {
			id: n.id,
			title: n.title,
			body: n.body,
			is_todo: n.is_todo,
			parent_id: n.parent_id,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			markup_language: n.markup_language,
			saveActionQueue: new AsyncActionQueue(300),
			originalCss: originalCss,
			hasChanged: false,
			user_updated_time: n.user_updated_time,
			encryption_applied: n.encryption_applied,
		};

		// Note that for performance reason,the call to setResourceInfos should
		// be first because it loads the resource infos in an async way. If we
		// swap them, the formNote will be updated first and rendered, then the
		// the resources will load, and the note will be re-rendered.
		setResourceInfos(await attachedResources(n.body));
		setFormNote(newFormNote);

		await handleResourceDownloadMode(n.body);

		return newFormNote;
	}

	useEffect(() => {
		// Check that synchronisation has just finished - and
		// if the note has never been changed, we reload it.
		// If the note has already been changed, it's a conflict
		// that's already been handled by the synchronizer.

		if (!prevSyncStarted) return () => {};
		if (syncStarted) return () => {};
		if (formNote.hasChanged) return () => {};

		reg.logger().debug('Sync has finished and note has never been changed - reloading it');

		let cancelled = false;

		const loadNote = async () => {
			const n = await Note.load(noteId);
			if (cancelled) return;

			// Normally should not happened because if the note has been deleted via sync
			// it would not have been loaded in the editor (due to note selection changing
			// on delete)
			if (!n) {
				reg.logger().warn('Trying to reload note that has been deleted:', noteId);
				return;
			}

			await initNoteState(n);
		};

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [prevSyncStarted, syncStarted, formNote]);

	useEffect(() => {
		if (!noteId) return () => {};

		if (formNote.id === noteId) return () => {};

		let cancelled = false;

		reg.logger().debug('Loading existing note', noteId);

		function handleAutoFocus(noteIsTodo: boolean) {
			if (!isProvisional) return;

			const focusSettingName = noteIsTodo ? 'newTodoFocus' : 'newNoteFocus';

			requestAnimationFrame(() => {
				if (Setting.value(focusSettingName) === 'title') {
					if (titleInputRef.current) titleInputRef.current.focus();
				} else {
					if (editorRef.current) editorRef.current.execCommand({ name: 'focus' });
				}
			});
		}

		async function loadNote() {
			const n = await Note.load(noteId);
			if (cancelled) return;
			if (!n) throw new Error(`Cannot find note with ID: ${noteId}`);
			reg.logger().debug('Loaded note:', n);

			await onBeforeLoad({ formNote });

			const newFormNote = await initNoteState(n);

			setIsNewNote(isProvisional);

			await onAfterLoad({ formNote: newFormNote });

			handleAutoFocus(!!n.is_todo);
		}

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [noteId, isProvisional, formNote]);

	const onResourceChange = useCallback(async function(event:any = null) {
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
			onResourceChange();
		}
	}, [previousNoteId, formNote.id, onResourceChange]);

	useEffect(() => {
		let cancelled = false;

		async function runEffect() {
			const r = await attachedResources(formNote.body);
			if (cancelled) return;
			setResourceInfos((previous:ResourceInfos) => {
				return resourceInfosChanged(previous, r) ? r : previous;
			});
		}

		runEffect();

		return () => {
			cancelled = true;
		};
	}, [formNote.body]);

	return { isNewNote, formNote, setFormNote, resourceInfos };
}
