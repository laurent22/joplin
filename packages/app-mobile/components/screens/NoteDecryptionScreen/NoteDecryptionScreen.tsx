import * as React from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
const { themeStyle } = require('../global-style.js');
import Logger from '@joplin/lib/Logger';
import { Button } from 'react-native-paper';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from '../../../utils/types';
import { Theme } from '@joplin/lib/themes/type';
import DecryptionWorker, { DecryptionWorkerState } from '@joplin/lib/services/DecryptionWorker';
import Note from '@joplin/lib/models/Note';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import useNoteDecryptionStatus from './useNoteDecryptionStatus';
import { NoteEntity } from '@joplin/lib/services/database/types';

const logger = Logger.create('screens/NoteDecryptionScreen');

interface Props {
	noteId: string;
	themeId: number;
	dispatch: Dispatch;
	decryptionWorkerState: DecryptionWorkerState;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme: Theme = themeStyle(themeId);

		const baseTextStyle = {
			color: theme.color,
			fontSize: (theme as any).fontSize ?? 12,
		};

		return {
			rootStyle: {
				backgroundColor: theme.backgroundColor,
				flex: 1,
			},
			headerStyle: {
				...baseTextStyle,
				fontSize: 20,
				marginTop: 20,
			},
			errorMessageStyle: {
				...baseTextStyle,
				color: theme.colorError,
			},
			statusTextStyle: {
				...baseTextStyle,
			},
			spacer: {
				flex: 1,
			},
		};
	}, [themeId]);
};

const NoteDecryptionScreenComponent = (props: Props) => {
	const [note, setNote] = useState<NoteEntity|null>(null);
	const { decrypted, decrypting, errorMessage } = useNoteDecryptionStatus(note, props.decryptionWorkerState);

	// Load the note
	useAsyncEffect(async (event) => {
		const loadedNote = await Note.load(props.noteId);
		if (event.cancelled) return;

		setNote(loadedNote);
	}, [props.noteId]);

	// Open the note when successful decryption happens
	useEffect(() => {
		if (decrypted) {
			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: props.noteId,
			});
		}
	}, [decrypted, props.dispatch, props.noteId]);

	const retryDecryption = useCallback(async () => {
		if (!note) {
			logger.warn('Unable to retry decryption of non-existent note.');
			return;
		}

		logger.info(`Retrying decryption of note ${props.noteId}...`);
		const decryptionWorker = DecryptionWorker.instance();
		await decryptionWorker.clearDisabledItem(note.type_, props.noteId);
		await decryptionWorker.scheduleStart();
	}, [props.noteId, note]);

	const styles = useStyles(props.themeId);

	const errorMessageComponent = (
		<>
			<Text style={styles.headerStyle}>{_('Error Message:')}</Text>
			<Text style={styles.errorMessageStyle}>{errorMessage}</Text>
		</>
	);

	const retryButton = (
		<Button
			mode='outlined'
			icon='refresh'
			onPress={retryDecryption}
		>
			<Text>{_('Retry Decryption')}</Text>
		</Button>
	);

	const decryptingMessage = (
		<Text style={styles.statusTextStyle}>{_('Decrypting...')}</Text>
	);

	return (
		<View style={styles.rootStyle}>
			<ScreenHeader />

			<Text style={styles.statusTextStyle}>
				{decrypting ? _('Decrypting...') : _('The note with ID %s is encrypted.', props.noteId)}
			</Text>

			{errorMessage ? errorMessageComponent : null}

			<View style={styles.spacer}/>

			{decrypting ? decryptingMessage : retryButton}
		</View>
	);
};

// Exported for testing.
export { NoteDecryptionScreenComponent };

const NoteDecryptionScreen = connect((state: AppState) => {
	return {
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
		themeId: state.settings.theme,
		decryptionWorkerState: state.decryptionWorker.state,
	};
})(NoteDecryptionScreenComponent);

export default NoteDecryptionScreen;
