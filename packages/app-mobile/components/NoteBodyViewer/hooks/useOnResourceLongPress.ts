import { useCallback } from 'react';
import shim from '@joplin/lib/shim';
import { CachesDirectoryPath } from 'react-native-fs';

const { ToastAndroid } = require('react-native');
const { _ } = require('@joplin/lib/locale.js');
import { reg } from '@joplin/lib/registry';
const { dialogs } = require('../../../utils/dialogs.js');
import Resource from '@joplin/lib/models/Resource';
const Share = require('react-native-share').default;

export default function useOnResourceLongPress(onJoplinLinkClick: Function, dialogBoxRef: any) {
	return useCallback(async (msg: string) => {
		try {
			const resourceId = msg.split(':')[1];
			const resource = await Resource.load(resourceId);
			const name = resource.title ? resource.title : resource.file_name;

			const action = await dialogs.pop({ dialogbox: dialogBoxRef.current }, name, [
				{ text: _('Open'), id: 'open' },
				{ text: _('Share'), id: 'share' },
			]);

			if (action === 'open') {
				onJoplinLinkClick(`joplgit in://${resourceId}`);
			} else if (action === 'share') {
				let filename = resource.file_name ?
					`${resource.file_name}.${resource.file_extension}` :
					resource.title;

				if (!filename) {
					filename = ['untitled', resource.file_extension].join('.');
				}

				const targetDir = `${CachesDirectoryPath}/sharedFiles`;
				await shim.fsDriver().mkdir(targetDir);

				const targetPath = `${targetDir}/${filename}`;

				await shim.fsDriver().copy(Resource.fullPath(resource), targetPath);

				await Share.open({
					type: resource.mime,
					filename: resource.title,
					url: `file://${targetPath}`,
					failOnCancel: false,
				});
			}
		} catch (e) {
			reg.logger().error('Could not handle link long press', e);
			ToastAndroid.show('An error occurred, check log for details', ToastAndroid.SHORT);
		}
	}, [onJoplinLinkClick]);
}
