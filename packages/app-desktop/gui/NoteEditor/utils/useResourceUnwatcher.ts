import ResourceEditWatcher from '@joplin/lib/services/ResourceEditWatcher';
import { useEffect } from 'react';

interface Props {
	noteId: string;
	windowId: string;
}

const useResourceUnwatcher = ({ noteId, windowId }: Props) => {
	useEffect(() => {
		// All resources associated with the current window should no longer be watched after:
		// 1. The editor unloads, or
		// 2. The note shown in the editor changes.
		// Unwatching in a cleanup callback handles both cases.
		return () => {
			void ResourceEditWatcher.instance().stopWatchingAll(windowId);
		};
	}, [noteId, windowId]);
};

export default useResourceUnwatcher;
