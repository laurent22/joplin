import { useCallback } from 'react';

const { ToastAndroid, NativeModules } = require('react-native');
const { _ } = require('@joplin/lib/locale.js');
import { reg } from '@joplin/lib/registry';
const { dialogs } = require('../../../utils/dialogs.js');
import Resource from '@joplin/lib/models/Resource';
import { copyToCache } from '../../../utils/ShareUtils';
import { Platform } from 'react-native';
const Share = require('react-native-share').default;

export default function useOnResourceLongPress(onJoplinLinkClick: Function, dialogBoxRef: any) {
	return useCallback(async (msg: string) => {
		try {
			const resourceId = msg.split(':')[1];
			const resource = await Resource.load(resourceId);
			const name = resource.title ? resource.title : resource.file_name;

			const actions = [
				{ text: _('Open'), id: 'open' },
				{ text: _('Share'), id: 'share' },
			];
			if (Platform.OS === 'android') {
				actions.push({ text: _('Save'), id: 'save' });
			}

			const action = await dialogs.pop({ dialogbox: dialogBoxRef.current }, name, actions);

			if (action === 'open') {
				onJoplinLinkClick(`joplin://${resourceId}`);
			} else if (action === 'share') {
				const fileToShare = await copyToCache(resource);

				await Share.open({
					type: resource.mime,
					filename: resource.title,
					url: `file://${fileToShare}`,
					failOnCancel: false,
				});
			} else if (action === 'save') {
				await NativeModules.ResourceExportModule.exportResource(
					Resource.friendlySafeFilename(resource),
					resource.mime,
					Resource.fullPath(resource));
			}
		} catch (e) {
			reg.logger().error('Could not handle link long press', e);
			ToastAndroid.show('An error occurred, check log for details', ToastAndroid.SHORT);
		}
	}, [onJoplinLinkClick]);
}
