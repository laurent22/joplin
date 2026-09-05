import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import conflictResolutionExtension, { setConflictRegions } from '@joplin/editor/CodeMirror/extensions/conflictResolutionExtension';
import loadConflictData, { ConflictDataStatus } from '@joplin/lib/services/conflict/loadConflictData';
import Note from '@joplin/lib/models/Note';
import buildConflictDocument, { ConflictDocument, ConflictRegionKind } from '@joplin/lib/services/conflict/buildConflictDocument';
import { MarkupLanguage } from '@joplin/renderer';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useConflictResolution');

interface Props {
	noteId: string;
	contentMarkupLanguage: number;
	editorRef: RefObject<CodeMirrorControl>;
	reloadCount: number;
}

interface LoadedDocument {
	noteId: string;
	document: ConflictDocument;
}

const useConflictResolution = ({ noteId, contentMarkupLanguage, editorRef, reloadCount }: Props) => {
	const [loaded, setLoaded] = useState<LoadedDocument|null>(null);

	const conflictDocument = loaded && loaded.noteId === noteId ? loaded.document : null;

	const extension = useMemo(() => conflictResolutionExtension(), []);
	const installedRef = useRef(false);

	useEffect(() => {
		// loadConflictData rejects everything else, so only markup needs checking here
		if (contentMarkupLanguage !== MarkupLanguage.Markdown) {
			setLoaded(null);
			return () => {};
		}

		let cancelled = false;

		const load = async () => {
			try {
				const note = await Note.load(noteId);
				if (cancelled) return;
				if (!note || !note.is_conflict) {
					setLoaded(null);
					return;
				}

				const data = await loadConflictData(noteId);
				if (cancelled) return;

				if (data.status !== ConflictDataStatus.Ok) {
					setLoaded(null);
					return;
				}

				setLoaded({ noteId, document: buildConflictDocument(data.sections) });
			} catch (error) {
				logger.warn('Could not load the conflict data for note', noteId, error);
				if (!cancelled) setLoaded(null);
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [noteId, contentMarkupLanguage, reloadCount]);

	useEffect(() => {
		if (!conflictDocument) {
			editorRef.current?.editor.dispatch({
				effects: setConflictRegions.of({ regions: [], forText: null }),
			});
			return () => {};
		}

		const install = () => {
			const control = editorRef.current;
			// The editor is created separately, so the ref may be empty on the first render.
			if (!control) return false;

			if (!installedRef.current) {
				control.addExtension(extension);
				installedRef.current = true;
			}

			if (control.editor.state.doc.toString() !== conflictDocument.text) return false;

			// The merge is not a user edit, so undo should not bring back the old body.
			control.clearHistory();

			control.editor.dispatch({
				effects: setConflictRegions.of({
					regions: conflictDocument.regions.map(region => ({
						from: region.from,
						to: region.to,
						localText: region.localText,
						addedByThem: region.kind === ConflictRegionKind.OnlyTheirs,
					})),
					forText: conflictDocument.text,
				}),
			});
			return true;
		};

		if (install()) return () => {};

		// The editor may not be ready yet, so retry until it is. Stop after a few tries
		// in case the document no longer matches.
		let attemptsLeft = 100;
		const interval = setInterval(() => {
			attemptsLeft--;
			if (install() || attemptsLeft <= 0) {
				clearInterval(interval);
				if (attemptsLeft <= 0) logger.warn('Gave up installing the conflict regions for note', noteId);
			}
		}, 50);
		return () => clearInterval(interval);
	}, [conflictDocument, extension, editorRef, noteId]);

	return { conflictContent: conflictDocument ? conflictDocument.text : null };
};

export default useConflictResolution;
