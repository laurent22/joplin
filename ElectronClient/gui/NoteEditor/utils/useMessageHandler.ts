import { useCallback } from 'react';
import { FormNote } from './types';
const BaseItem = require('lib/models/BaseItem');
const { _ } = require('lib/locale');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const { bridge } = require('electron').remote.require('./bridge');
const { urlDecode } = require('lib/string-utils');
const urlUtils = require('lib/urlUtils');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const fs = require('fs-extra');
const { clipboard } = require('electron');
const { toSystemSlashes } = require('lib/path-utils');
const { reg } = require('lib/registry.js');

export default function useMessageHandler(scrollWhenReady:any, setScrollWhenReady:Function, editorRef:any, setLocalSearchResultCount:Function, dispatch:Function, formNote:FormNote) {
	return useCallback(async (event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg !== 'percentScroll') console.info(`Got ipc-message: ${msg}`, args);

		if (msg.indexOf('error:') === 0) {
			const s = msg.split(':');
			s.splice(0, 1);
			reg.logger().error(s.join(':'));
		} else if (msg === 'noteRenderComplete') {
			if (scrollWhenReady) {
				const options = { ...scrollWhenReady };
				setScrollWhenReady(null);
				editorRef.current.scrollTo(options);
			}
		} else if (msg === 'setMarkerCount') {
			setLocalSearchResultCount(arg0);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const s = msg.split(':');
			if (s.length < 2) throw new Error(`Invalid message: ${msg}`);
			ResourceFetcher.instance().markForDownload(s[1]);
		} else if (msg === 'contextMenu') {
			const itemType = arg0 && arg0.type;

			const menu = new Menu();

			if (itemType === 'image' || itemType === 'resource') {
				const resource = await Resource.load(arg0.resourceId);
				const resourcePath = Resource.fullPath(resource);

				menu.append(
					new MenuItem({
						label: _('Open...'),
						click: async () => {
							const ok = bridge().openExternal(`file://${resourcePath}`);
							if (!ok) bridge().showErrorMessageBox(_('This file could not be opened: %s', resourcePath));
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Save as...'),
						click: async () => {
							const filePath = bridge().showSaveDialog({
								defaultPath: resource.filename ? resource.filename : resource.title,
							});
							if (!filePath) return;
							await fs.copy(resourcePath, filePath);
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Copy path to clipboard'),
						click: async () => {
							clipboard.writeText(toSystemSlashes(resourcePath));
						},
					})
				);
			} else if (itemType === 'text') {
				menu.append(
					new MenuItem({
						label: _('Copy'),
						click: async () => {
							clipboard.writeText(arg0.textToCopy);
						},
					})
				);
			} else if (itemType === 'link') {
				menu.append(
					new MenuItem({
						label: _('Copy Link Address'),
						click: async () => {
							clipboard.writeText(arg0.textToCopy);
						},
					})
				);
			} else {
				reg.logger().error(`Unhandled item type: ${itemType}`);
				return;
			}

			menu.popup(bridge().window());
		} else if (msg.indexOf('joplin://') === 0) {
			const resourceUrlInfo = urlUtils.parseResourceUrl(msg);
			const itemId = resourceUrlInfo.itemId;
			const item = await BaseItem.loadItemById(itemId);

			if (!item) throw new Error(`No item with ID ${itemId}`);

			if (item.type_ === BaseModel.TYPE_RESOURCE) {
				const localState = await Resource.localState(item);
				if (localState.fetch_status !== Resource.FETCH_STATUS_DONE || !!item.encryption_blob_encrypted) {
					if (localState.fetch_status === Resource.FETCH_STATUS_ERROR) {
						bridge().showErrorMessageBox(`${_('There was an error downloading this attachment:')}\n\n${localState.fetch_error}`);
					} else {
						bridge().showErrorMessageBox(_('This attachment is not downloaded or not decrypted yet'));
					}
					return;
				}
				const filePath = Resource.fullPath(item);
				bridge().openItem(filePath);
			} else if (item.type_ === BaseModel.TYPE_NOTE) {
				dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: item.parent_id,
					noteId: item.id,
					hash: resourceUrlInfo.hash,
					historyNoteAction: {
						id: formNote.id,
						parent_id: formNote.parent_id,
					},
				});
			} else {
				throw new Error(`Unsupported item type: ${item.type_}`);
			}
		} else if (urlUtils.urlProtocol(msg)) {
			if (msg.indexOf('file://') === 0) {
				// When using the file:// protocol, openExternal doesn't work (does nothing) with URL-encoded paths
				require('electron').shell.openExternal(urlDecode(msg));
			} else {
				require('electron').shell.openExternal(msg);
			}
		} else if (msg.indexOf('#') === 0) {
			// This is an internal anchor, which is handled by the WebView so skip this case
		} else {
			bridge().showErrorMessageBox(_('Unsupported link or message: %s', msg));
		}
	}, [dispatch, setLocalSearchResultCount, scrollWhenReady, formNote]);
}
