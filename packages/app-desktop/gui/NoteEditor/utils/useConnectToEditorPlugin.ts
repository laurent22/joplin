import EditorPluginHandler, { OnSaveNoteCallback } from '@joplin/lib/services/plugins/EditorPluginHandler';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { FormNote } from './types';
import { WindowIdContext } from '../../NewWindowOrIFrame';
import Logger from '@joplin/utils/Logger';
import { PluginEditorViewState, PluginStates } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { OnSetFormNote } from './useFormNote';

const logger = Logger.create('useEditorPlugin');

type OnScheduleSaveNote = (formNote: FormNote)=> Promise<void>;

interface Props {
	plugins: PluginStates;
	startupPluginsLoaded: boolean;
	formNote: FormNote;
	activeEditorView: PluginEditorViewState;
	setFormNote: OnSetFormNote;
	scheduleSaveNote: OnScheduleSaveNote;
	effectiveNoteId: string;
	shownEditorViewIds: string[];
}

const useEditorPluginHandler = (formNote: FormNote, setFormNote: OnSetFormNote, scheduleSaveNote: OnScheduleSaveNote) => {
	const formNoteRef = useRef(formNote);
	formNoteRef.current = formNote;
	const lastEditorPluginSaveRef = useRef<FormNote|null>(null);

	return useMemo(() => {
		const onSave: OnSaveNoteCallback = async (newContent) => {
			const changed = newContent.body !== formNoteRef.current.body || newContent.id !== formNoteRef.current.id;
			if (!changed) return;

			const differentId = newContent.id !== formNoteRef.current.id;
			const sameIdAsLastSave = newContent.id === lastEditorPluginSaveRef.current?.id;
			// Ensure that the note is being saved with the correct parent_id, title, etc.
			const sourceFormNote = differentId && sameIdAsLastSave ? lastEditorPluginSaveRef.current : formNoteRef.current;
			const newFormNote = {
				...sourceFormNote,
				id: newContent.id,
				body: newContent.body,
				hasChanged: true,
			};

			lastEditorPluginSaveRef.current = newFormNote;
			setFormNote(newFormNote);
			return scheduleSaveNote(newFormNote);
		};
		return new EditorPluginHandler(PluginService.instance(), onSave);
	}, [setFormNote, scheduleSaveNote]);
};

const useLoadedViewIdsCacheKey = (windowId: string, plugins: PluginStates) => {
	return useMemo(() => {
		const viewIds = [];
		for (const plugin of Object.values(plugins)) {
			for (const view of Object.values(plugin.views)) {
				if (view.containerType === ContainerType.Editor && view.parentWindowId === windowId) {
					viewIds.push(view.id);
				}
			}
		}
		// Create a string that can be easily checked for changes as an effect dependency
		return JSON.stringify(viewIds);
	}, [windowId, plugins]);
};

// Connects editor plugins to the current editor (handles editor plugin saving, loading).
const useConnectToEditorPlugin = ({
	plugins, startupPluginsLoaded, setFormNote, formNote, scheduleSaveNote, effectiveNoteId, activeEditorView, shownEditorViewIds,
}: Props) => {
	const windowId = useContext(WindowIdContext);
	const loadedViewIdCacheKey = useLoadedViewIdsCacheKey(windowId, plugins);
	const editorPluginHandler = useEditorPluginHandler(formNote, setFormNote, scheduleSaveNote);

	useQueuedAsyncEffect(async () => {
		if (!startupPluginsLoaded) return;
		logger.debug('Emitting activation check for views:', loadedViewIdCacheKey);

		await editorPluginHandler.emitActivationCheck({
			parentWindowId: windowId,
			noteId: effectiveNoteId,
		});
		// It's important to re-run the activation check when the loaded view IDs change.
		// As such, `loadedViewIds` needs to be in the dependencies list:
	}, [loadedViewIdCacheKey, windowId, effectiveNoteId, editorPluginHandler, startupPluginsLoaded]);

	useEffect(() => {
		if (activeEditorView) {
			editorPluginHandler.onEditorPluginShown(activeEditorView.id);
		}
	}, [activeEditorView, editorPluginHandler]);

	const formNoteBody = formNote.body;
	useEffect(() => {
		editorPluginHandler.emitUpdate({
			noteId: effectiveNoteId,
			newBody: formNoteBody,
		}, shownEditorViewIds);
	}, [effectiveNoteId, formNoteBody, editorPluginHandler, shownEditorViewIds]);
};

export default useConnectToEditorPlugin;
