import { useState, useEffect } from 'react';
import Folder from '@joplin/lib/models/Folder';

interface HookDependencies {
	folderId: string;
}

export default function(dependencies: HookDependencies) {
	const { folderId } = dependencies;
	const [folder, setFolder] = useState(null);

	useEffect(() => {
		let cancelled = false;

		async function loadFolder() {
			const f = await Folder.load(folderId);
			if (cancelled) return;
			setFolder(f);
		}

		void loadFolder();

		return function() {
			cancelled = true;
		};
	}, [folderId]);

	return folder;
}
