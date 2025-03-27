import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { CommandRuntimeProps } from '../types';
import { Platform } from 'react-native';
import pickDocument from '../../../../utils/pickDocument';
import { ImagePickerResponse, launchImageLibrary } from 'react-native-image-picker';
import Logger from '@joplin/utils/Logger';
import { msleep } from '@joplin/utils/time';

const logger = Logger.create('attachFile');

export enum AttachFileAction {
	TakePhoto = 'takePhoto',
	AttachFile = 'attachFile',
	AttachPhoto = 'attachPhoto',
	AttachDrawing = 'attachDrawing',
	RecordAudio = 'attachRecording',
}

export interface AttachFileOptions {
	action?: AttachFileAction | null;
}

export const declaration: CommandDeclaration = {
	name: 'attachFile',
	label: () => _('Attach file'),
	iconName: 'material attachment',
};

export const runtime = (props: CommandRuntimeProps): CommandRuntime => {
	const takePhoto = async () => {
		if (Platform.OS === 'web') {
			const response = await pickDocument({ multiple: true, preferCamera: true });
			for (const asset of response) {
				await props.attachFile(asset, 'image');
			}
		} else {
			props.setCameraVisible(true);
		}
	};
	const attachFile = async () => {
		const response = await pickDocument({ multiple: true });
		for (const asset of response) {
			await props.attachFile(asset, 'all');
		}
	};
	const attachPhoto = async () => {
		// the selection Limit should be specified. I think 200 is enough?
		const response: ImagePickerResponse = await launchImageLibrary({
			mediaType: 'mixed',
			videoQuality: 'low',
			formatAsMp4: true,
			includeBase64: false,
			selectionLimit: 200,
		});

		if (response.errorCode) {
			logger.warn('Got error from picker', response.errorCode);
			return;
		}

		if (response.didCancel) {
			logger.info('User cancelled picker');
			return;
		}

		for (const asset of response.assets) {
			await props.attachFile(asset, asset.type);
		}
	};

	const recordAudio = async () => {
		props.setAudioRecorderVisible(true);
	};

	const showAttachMenu = async (action: AttachFileAction = null) => {
		props.hideKeyboard();

		let buttonId: AttachFileAction = null;

		if (action) {
			buttonId = action;
		} else {
			const buttons = [];

			// On iOS, it will show "local files", which means certain files saved from the browser
			// and the iCloud files, but it doesn't include photos and images from the CameraRoll
			//
			// On Android, it will depend on the phone, but usually it will allow browsing all files and photos.
			buttons.push({ text: _('Attach file'), id: AttachFileAction.AttachFile });
			buttons.push({ text: _('Record audio'), id: AttachFileAction.RecordAudio });

			// Disabled on Android because it doesn't work due to permission issues, but enabled on iOS
			// because that's only way to browse photos from the camera roll.
			if (Platform.OS === 'ios') buttons.push({ text: _('Attach photo'), id: AttachFileAction.AttachPhoto });
			buttons.push({ text: _('Take photo'), id: AttachFileAction.TakePhoto });

			buttonId = await props.dialogs.showMenu(_('Choose an option'), buttons) as AttachFileAction;

			if (Platform.OS === 'ios') {
				// Fixes an issue: The first time "attach file" or "attach photo" is chosen after starting Joplin
				// on iOS, no attach dialog was shown. Adding a brief delay after the "choose an option" dialog is
				// dismissed seems to fix the issue.
				await msleep(1);
			}
		}

		if (buttonId === AttachFileAction.TakePhoto) await takePhoto();
		if (buttonId === AttachFileAction.AttachFile) await attachFile();
		if (buttonId === AttachFileAction.AttachPhoto) await attachPhoto();
		if (buttonId === AttachFileAction.RecordAudio) await recordAudio();
	};

	return {
		execute: async (_context: CommandContext, filePath?: string, options: AttachFileOptions = null) => {
			options = {
				action: null,
				...options,
			};

			if (filePath) {
				await props.attachFile({ uri: filePath }, 'all');
			} else {
				await showAttachMenu(options.action);
			}
		},

		enabledCondition: '!noteIsReadOnly',
	};
};
