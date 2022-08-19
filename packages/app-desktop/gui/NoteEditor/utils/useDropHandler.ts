import { useCallback } from 'react';
import Note from '@joplin/lib/models/Note';

interface HookDependencies {
	editorRef: any;
}

export default function useDropHandler(dependencies: HookDependencies) {
	const { editorRef } = dependencies;

	return useCallback(async (event: any) => {
		if (!event.dataTransfer) return;

		const dt = event.dataTransfer;
		const createFileURL = event.altKey;

		if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
			const noteIds = JSON.parse(dt.getData('text/x-jop-note-ids'));
			const noteMarkdownTags = [];
			for (let i = 0; i < noteIds.length; i++) {
				const note = await Note.load(noteIds[i]);
				noteMarkdownTags.push(Note.markdownTag(note));
			}

			editorRef.current.execCommand({
				name: 'dropItems',
				value: {
					type: 'notes',
					markdownTags: noteMarkdownTags,
				},
			});

			return;
		}

		const files = dt.files;
		if (files && files.length) {
			const paths = [];
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				if (!file.path) continue;
				paths.push(file.path);
			}

			editorRef.current.execCommand({
				name: 'dropItems',
				value: {
					type: 'files',
					paths: paths,
					createFileURL: createFileURL,
				},
			});
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);
}
