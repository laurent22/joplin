import { useEffect, useMemo, useState } from 'react';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import { NoteEntity } from '@joplin/lib/services/database/types';

// If null, assumes that `note` is still loading.
// If given, note should be a NoteEntity with the encryption_applied flag set to either true or false.
const useNoteDecryptionStatus = (note: NoteEntity|null, decryptionWorkerState: 'started'|'idle') => {
	const [decrypting, setDecrypting] = useState<boolean>(false);
	const [decrypted, setDecrypted] = useState<boolean>(false);
	const [decryptionDisabled, setDecryptionDisabled] = useState<boolean|null>(null);
	const [errorMessage, setErrorMessage] = useState<string|null>(null);

	const noteId = note?.id ?? null;

	const decryptionWorker: DecryptionWorker = useMemo(() => {
		return DecryptionWorker.instance();
	}, []);

	useEffect(() => {
		// Assume encrypted if the note hasn't loaded yet
		const encrypted = note?.encryption_applied ?? true;
		setDecrypted(!encrypted);
	}, [note]);

	// Determine and store whether the note is currently being decrypted
	useAsyncEffect(async event => {
		if (noteId === null) {
			return;
		}

		const disabledItems = await decryptionWorker.decryptionDisabledItems();
		if (event.cancelled) return;

		const disabled = disabledItems.map(item => item.id).includes(noteId);
		setDecryptionDisabled(disabled);

		if (disabled || decryptionWorkerState === 'idle') {
			setDecrypting(false);
		} else if (!decrypted && decryptionWorkerState === 'started') {
			setDecrypting(true);
		}
	}, [decryptionWorker, noteId, decryptionWorkerState, decrypted]);

	// Store decryption errors
	useEffect(() => {
		// No note, hence no error message.
		if (noteId === null) {
			setDecrypting(false);
			setDecrypted(false);
			setErrorMessage(null);

			// No cleanup necessary
			return () => {};
		}

		const decryptionFailureListener = (event: any) => {
			if (event?.id === noteId) {
				setErrorMessage(`${event.error}`);
				setDecrypting(false);
			}
		};
		const failureEventName = 'itemDecryptionFailed';
		decryptionWorker.on(failureEventName, decryptionFailureListener);

		const decryptionSuccessListener = (event: any) => {
			if (event?.id === noteId) {
				setDecrypting(false);
				setDecrypted(true);
				setErrorMessage(null);
			}
		};
		const successEventName = 'resourceDecrypted';
		decryptionWorker.on(successEventName, decryptionSuccessListener);

		return () => {
			decryptionWorker.off(failureEventName, decryptionFailureListener);
			decryptionWorker.off(successEventName, decryptionSuccessListener);
		};
	}, [noteId, decryptionWorker, setDecrypted, setDecrypting, setErrorMessage]);

	return {
		decrypting,
		decrypted,
		errorMessage,
		decryptionDisabled,
	};
};
export default useNoteDecryptionStatus;
