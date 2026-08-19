import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';
import { AppState } from '../../../utils/types';
import { useCallback, useMemo, useState } from 'react';
import { themeStyle } from '../../global-style';
import CameraViewMultiPage from '../../CameraView/CameraViewMultiPage';
import { Dispatch } from 'redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { CameraResult } from '../../CameraView/types';
import NotePreview, { CreateNoteEvent } from './NotePreview';
import shim from '@joplin/lib/shim';
import Note from '@joplin/lib/models/Note';
import Tag from '@joplin/lib/models/Tag';
import { Portal, ProgressBar, Snackbar } from 'react-native-paper';
import useBackHandler from '../../../utils/hooks/useBackHandler';
import Logger from '@joplin/utils/Logger';
import NavService from '@joplin/lib/services/NavService';
import { ResourceOcrDriverId, ResourceOcrStatus } from '@joplin/lib/services/database/types';

const logger = Logger.create('DocumentScanner');

interface Props {
	dispatch: Dispatch;
	themeId: number;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			root: theme.rootStyle,
			noRemainingPhotosContainer: {
				margin: theme.margin,
				gap: theme.margin,
			},
			progressBarContainer: {
				flexGrow: 0,
			},
		});
	}, [themeId]);
};

const DocumentScanner: React.FC<Props> = ({ themeId, dispatch }) => {
	const styles = useStyles(themeId);
	const [cameraVisible, setCameraVisible] = useState(true);
	const [photos, setPhotos] = useState<CameraResult[]>([]);
	const [snackbarMessage, setSnackbarMessage] = useState('');
	const [creatingNote, setCreatingNote] = useState(false);

	useBackHandler(() => {
		if (photos.length && !cameraVisible) {
			setCameraVisible(true);
			return true;
		}
		return false;
	});

	const onDeleteLastPhoto = useCallback(() => {
		if (photos.length <= 1) {
			setCameraVisible(true);
		}

		setSnackbarMessage('');
		setPhotos(photos => {
			const result = [...photos];
			result.pop();
			return result;
		});
	}, [photos]);

	const onCloseScreen = useCallback(() => {
		setPhotos([]);
		dispatch({ type: 'NAV_BACK' });
	}, [dispatch]);

	const onCreateNote = useCallback(async (event: CreateNoteEvent) => {
		setSnackbarMessage(_('Creating note "%s"...', event.title));
		setCreatingNote(true);
		logger.info('Creating note', event.queueForTranscription ? '(with transcription)' : '');

		try {
			const resources = [];
			for (const image of photos) {
				resources.push(await shim.createResourceFromPath(
					image.uri,
					{
						...(event.queueForTranscription ? {
							ocr_status: ResourceOcrStatus.Todo,
							ocr_driver_id: ResourceOcrDriverId.HandwrittenText,
							ocr_details: '',
							ocr_error: '',
							ocr_text: '',
						} : {}),
						title: event.title,
						mime: image.type,
					},
				));
			}

			const note = await Note.save({
				title: event.title,
				body: resources.map(
					(image, index) => `![${_('Photo %d', index + 1)}](:/${image.id})`,
				).join('\n\n'),
				parent_id: event.parentId,
			});
			await Tag.setNoteTagsByTitles(note.id, event.tags);

			await NavService.go('Note', { noteId: note.id });
		} catch (error) {
			logger.error('Error creating note', error);
			await shim.showErrorDialog(`Failed to create note: ${error}`);
		} finally {
			setCreatingNote(false);
		}
	}, [photos]);

	const onDismissSnackbar = useCallback(() => {
		setSnackbarMessage('');
	}, []);

	const onHideCamera = useCallback(() => {
		setCameraVisible(false);
	}, []);

	const renderContent = () => {
		if (cameraVisible) {
			return <CameraViewMultiPage
				themeId={themeId}
				onCancel={onCloseScreen}
				onComplete={onHideCamera}
				photos={photos}
				onSetPhotos={setPhotos}
				onInsertBarcode={()=>{}}
			/>;
		} else if (photos.length > 0) {
			return <>
				<ScreenHeader title={_('Note preview')} onDeleteButtonPress={onDeleteLastPhoto}/>
				{creatingNote && <View style={styles.progressBarContainer}>
					<ProgressBar visible indeterminate aria-label={_('Creating note.')}/>
				</View>}
				<NotePreview
					imageCount={photos.length}
					lastImage={photos[photos.length - 1]}
					onCreateNote={creatingNote ? null : onCreateNote}
				/>
			</>;
		} else {
			// Error/loading state
			return <>
				<ScreenHeader title={'Document scanner'}/>
			</>;
		}
	};

	return <View style={styles.root}>
		{renderContent()}
		<Portal>
			<Snackbar
				key={`snackbar--${snackbarMessage}`}
				visible={!!snackbarMessage}
				onDismiss={onDismissSnackbar}
				action={{
					label: _('Dismiss'),
					onPress: onDismissSnackbar,
				}}
			>{snackbarMessage}</Snackbar>
		</Portal>
	</View>;
};

export default connect((state: AppState) => ({
	themeId: state.settings.theme,
}))(DocumentScanner);
