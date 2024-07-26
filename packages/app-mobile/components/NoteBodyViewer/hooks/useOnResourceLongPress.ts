import { useCallback } from 'react';

const { _ } = require('@joplin/lib/locale.js');
import { reg } from '@joplin/lib/registry';
const { dialogs } = require('../../../utils/dialogs.js');
import Resource from '@joplin/lib/models/Resource';
import { copyToCache } from '../../../utils/ShareUtils';
import isEditableResource from '../../NoteEditor/ImageEditor/isEditableResource';
import shim from '@joplin/lib/shim';
import shareFile from '../../../utils/shareFile';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useOnResourceLongPress');

interface Callbacks {
	onJoplinLinkClick: (link: string)=> void;
	onRequestEditResource: (message: string)=> void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function useOnResourceLongPress(callbacks: Callbacks, dialogBoxRef: any) {
	const { onJoplinLinkClick, onRequestEditResource } = callbacks;

	return useCallback(async (msg: string) => {
		try {
			const resourceId = msg.split(':')[1];
			const resource = await Resource.load(resourceId);

			// Handle the case where it's a long press on a link with no resource
			if (!resource) {
				logger.warn(`Long-press: Resource with ID ${resourceId} does not exist (may be a note).`);
				return;
			}

			const name = resource.title ? resource.title : resource.filename;
			const mime: string|undefined = resource.mime;

			const actions = [];

			actions.push({ text: _('Open'), id: 'open' });
			if (mime && isEditableResource(mime)) {
				actions.push({ text: _('Edit'), id: 'edit' });
			}
			actions.push({ text: _('Share'), id: 'share' });

			const action = await dialogs.pop({ dialogbox: dialogBoxRef.current }, name, actions);

			if (action === 'open') {
				onJoplinLinkClick(`joplin://${resourceId}`);
			} else if (action === 'share') {
				const fileToShare = await copyToCache(resource);
				await shareFile(fileToShare, resource.mime);
			} else if (action === 'edit') {
				onRequestEditResource(`edit:${resourceId}`);
			}
		} catch (e) {
			logger.error(e);
			reg.logger().error('Could not handle link long press', e);
			void shim.showMessageBox(`An error occurred, check log for details: ${e}`);
		}
	}, [onJoplinLinkClick, onRequestEditResource, dialogBoxRef]);
}
