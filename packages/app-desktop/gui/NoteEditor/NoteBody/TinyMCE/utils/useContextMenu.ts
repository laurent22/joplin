import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import { useEffect } from 'react';
import bridge from '../../../../../services/bridge';
import { ContextMenuOptions, ContextMenuItemType } from '../../../utils/contextMenuUtils';
import { menuItems } from '../../../utils/contextMenu';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';

import Resource from '@joplin/lib/models/Resource';
import { TinyMceEditorEvents } from './types';
import { HtmlToMarkdownHandler, MarkupToHtmlHandler } from '../../../utils/types';
import { Editor } from 'tinymce';

const menuUtils = new MenuUtils(CommandService.instance());

// x and y are the absolute coordinates, as returned by the context-menu event
// handler on the webContent. This function will return null if the point is
// not within the TinyMCE editor.
function contextMenuElement(editor: Editor, x: number, y: number) {
	if (!editor || !editor.getDoc()) return null;

	const containerDoc = editor.getContainer().ownerDocument;
	const iframes = containerDoc.getElementsByClassName('tox-edit-area__iframe');
	if (!iframes.length) return null;

	const zoom = Setting.value('windowContentZoomFactor') / 100;
	const xScreen = x / zoom;
	const yScreen = y / zoom;

	// We use .elementFromPoint to handle the case where a dialog is covering
	// part of the editor.
	const targetElement = containerDoc.elementFromPoint(xScreen, yScreen);
	if (targetElement !== iframes[0]) {
		return null;
	}

	const iframeRect = iframes[0].getBoundingClientRect();
	const relativeX = xScreen - iframeRect.left;
	const relativeY = yScreen - iframeRect.top;
	return editor.getDoc().elementFromPoint(relativeX, relativeY);
}

interface ContextMenuActionOptions {
	current: ContextMenuOptions;
}

const contextMenuActionOptions: ContextMenuActionOptions = { current: null };

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
export default function(editor: Editor, plugins: PluginStates, dispatch: Function, htmlToMd: HtmlToMarkdownHandler, mdToHtml: MarkupToHtmlHandler) {
	useEffect(() => {
		if (!editor) return () => {};

		const contextMenuItems = menuItems(dispatch, htmlToMd, mdToHtml);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function onContextMenu(_event: any, params: any) {
			const element = contextMenuElement(editor, params.x, params.y);
			if (!element) return;

			let itemType: ContextMenuItemType = ContextMenuItemType.None;
			let resourceId = '';
			let linkToCopy = null;

			if (element.nodeName === 'IMG') {
				itemType = ContextMenuItemType.Image;
				resourceId = Resource.pathToId((element as HTMLImageElement).src);
			} else if (element.nodeName === 'A') {
				resourceId = Resource.pathToId((element as HTMLAnchorElement).href);
				itemType = resourceId ? ContextMenuItemType.Resource : ContextMenuItemType.Link;
				linkToCopy = element.getAttribute('href') || '';
			} else {
				itemType = ContextMenuItemType.Text;
			}

			contextMenuActionOptions.current = {
				itemType,
				resourceId,
				filename: null,
				mime: null,
				linkToCopy,
				textToCopy: null,
				htmlToCopy: editor.selection ? editor.selection.getContent() : '',
				insertContent: (content: string) => {
					editor.insertContent(content);
				},
				isReadOnly: false,
				fireEditorEvent: (event: TinyMceEditorEvents) => {
					editor.fire(event);
				},
				htmlToMd,
				mdToHtml,
			};

			let template = [];

			for (const itemName in contextMenuItems) {
				const item = contextMenuItems[itemName];

				if (!item.isActive(itemType, contextMenuActionOptions.current)) continue;

				template.push({
					label: item.label,
					click: () => {
						item.onAction(contextMenuActionOptions.current);
					},
				});
			}

			const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(params.misspelledWord, params.dictionarySuggestions);

			for (const item of spellCheckerMenuItems) {
				template.push(item);
			}

			template = template.concat(menuUtils.pluginContextMenuItems(plugins, MenuItemLocation.EditorContextMenu));

			const menu = bridge().Menu.buildFromTemplate(template);
			menu.popup();
		}

		bridge().activeWindow().webContents.on('context-menu', onContextMenu);

		return () => {
			if (bridge().activeWindow()?.webContents?.off) {
				bridge().activeWindow().webContents.off('context-menu', onContextMenu);
			}
		};
	}, [editor, plugins, dispatch, htmlToMd, mdToHtml]);
}
