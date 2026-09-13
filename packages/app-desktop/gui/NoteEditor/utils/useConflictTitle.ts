import { useCallback, useEffect, useRef, useState } from 'react';
import loadConflictData, { ConflictDataStatus } from '@joplin/lib/services/conflict/loadConflictData';
import Note from '@joplin/lib/models/Note';
import eventManager, { EventName, ItemChangeEvent } from '@joplin/lib/eventManager';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useConflictTitle');

interface ConflictTitles {
	conflictTitle: string;
	remoteTitle: string;
}

const useConflictTitle = (noteId: string) => {
	const [titles, setTitles] = useState<ConflictTitles|null>(null);
	const [reloadCount, setReloadCount] = useState(0);
	const [remoteUpdatedTime, setRemoteUpdatedTime] = useState(0);
	const [isConflict, setIsConflict] = useState(false);
	const [resolvedTitle, setResolvedTitle] = useState<string|null>(null);
	const [loadedNoteId, setLoadedNoteId] = useState<string|null>(null);
	const [originalIsStale, setOriginalIsStale] = useState(false);
	const [originalId, setOriginalId] = useState<string|null>(null);
	const remoteUpdatedTimeRef = useRef(0);

	const loaded = loadedNoteId === noteId;
	const active = loaded ? titles : null;

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			try {
				const note = await Note.load(noteId);
				if (cancelled) return;

				setOriginalIsStale(false);
				setOriginalId(note?.conflict_original_id ?? null);

				if (!note || !note.is_conflict) {
					setTitles(null);
					setIsConflict(false);
					setLoadedNoteId(noteId);
					return;
				}

				const data = await loadConflictData(noteId);
				if (cancelled) return;

				setIsConflict(data.status === ConflictDataStatus.Ok);
				setRemoteUpdatedTime(data.remoteUpdatedTime);
				remoteUpdatedTimeRef.current = data.remoteUpdatedTime;

				if (data.status !== ConflictDataStatus.Ok || !data.titleConflict) {
					setTitles(null);
					setLoadedNoteId(noteId);
					return;
				}

				setTitles({ conflictTitle: data.localTitle, remoteTitle: data.remoteTitle });
				// The incoming title is kept unless the user chooses otherwise.
				setResolvedTitle(data.remoteTitle);
				setLoadedNoteId(noteId);
			} catch (error) {
				logger.warn('Could not load the conflict titles for note', noteId, error);
				if (!cancelled) {
					setTitles(null);
					setIsConflict(false);
					setLoadedNoteId(noteId);
				}
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [noteId, reloadCount]);

	const checkOriginal = useCallback(async () => {
		if (!originalId) return;
		try {
			const original = await Note.load(originalId);
			// A deleted original is handled by the finish step, which reports it properly
			if (!original) return;
			if (original.updated_time > remoteUpdatedTimeRef.current) setOriginalIsStale(true);
		} catch (error) {
			logger.warn('Could not check whether the original note changed', originalId, error);
		}
	}, [originalId]);

	useEffect(() => {
		if (!loaded || !isConflict || !originalId) return () => {};

		const onItemChange = (event: ItemChangeEvent) => {
			if (event.itemType !== ModelType.Note || event.itemId !== originalId) return;
			void checkOriginal();
		};
		const onSyncComplete = () => {
			void checkOriginal();
		};

		eventManager.on(EventName.ItemChange, onItemChange);
		eventManager.on(EventName.SyncComplete, onSyncComplete);
		return () => {
			eventManager.off(EventName.ItemChange, onItemChange);
			eventManager.off(EventName.SyncComplete, onSyncComplete);
		};
	}, [loaded, isConflict, originalId, checkOriginal]);

	return {
		conflictTitle: active ? active.conflictTitle : null,
		resolvedTitle: active ? (resolvedTitle ?? active.remoteTitle) : null,
		setResolvedTitle,
		hasTitleConflict: !!active,
		isConflictNote: loaded && isConflict,
		remoteUpdatedTime,
		originalIsStale: loaded && isConflict && originalIsStale,
		reloadConflict: () => setReloadCount(count => count + 1),
	};
};

export default useConflictTitle;
