import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import { useEffect } from 'react';
import bridge from '../../../../../services/bridge';
import { ContextMenuOptions, ContextMenuItemType } from '../../../utils/contextMenuUtils';
import { menuItems } from '../../../utils/contextMenu';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import type { ContextMenuParams, Event as ElectronEvent, MenuItemConstructorOptions } from 'electron';

import Resource from '@joplin/lib/models/Resource';
import { TinyMceEditorEvents } from './types';
import { HtmlToMarkdownHandler, MarkupToHtmlHandler } from '../../../utils/types';
import { Editor } from 'tinymce';
import { EditDialogControl } from './useEditDialog';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import type { MenuItem as MenuItemType } from 'electron';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const menuUtils = new MenuUtils(CommandService.instance());

interface ContextMenuActionOptions {
	current: ContextMenuOptions;
}

const contextMenuActionOptions: ContextMenuActionOptions = { current: null };

export default function(editor: Editor, plugins: PluginStates, dispatch: Dispatch, htmlToMd: HtmlToMarkdownHandler, mdToHtml: MarkupToHtmlHandler, editDialog: EditDialogControl) {
	useEffect(() => {
		if (!editor) return () => {};

		const contextMenuItems = menuItems(dispatch);
		const targetWindow = bridge().activeWindow();

		const makeMainMenuItems = (element: Element) => {
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

			const result = [];
			for (const itemName in contextMenuItems) {
				const item = contextMenuItems[itemName];

				if (!item.isActive(itemType, contextMenuActionOptions.current)) continue;

				result.push(new MenuItem({
					label: item.label,
					click: () => {
						item.onAction(contextMenuActionOptions.current);
					},
				}));
			}
			return result;
		};

		const makeEditableMenuItems = (element: Element) => {
			if (editDialog.isEditable(element)) {
				return [
					new MenuItem({
						type: 'normal',
						label: _('Edit'),
						click: () => {
							editDialog.editExisting(element);
						},
					}),
					new MenuItem({ type: 'separator' }),
				];
			}
			return [];
		};

		const showContextMenu = (element: HTMLElement, misspelledWord: string|null, dictionarySuggestions: string[]) => {
			const menu = new Menu();
			const menuItems: MenuItemType[] = [];
			const toMenuItems = (specs: MenuItemConstructorOptions[]) => {
				return specs.map(spec => new MenuItem(spec));
			};

			menuItems.push(...makeEditableMenuItems(element));
			menuItems.push(...makeMainMenuItems(element));
			const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(misspelledWord, dictionarySuggestions);
			menuItems.push(
				...toMenuItems(spellCheckerMenuItems),
			);
			menuItems.push(
				...toMenuItems(menuUtils.pluginContextMenuItems(plugins, MenuItemLocation.EditorContextMenu)),
			);

			for (const item of menuItems) {
				menu.append(item);
			}
			menu.popup({ window: targetWindow });
		};

		let lastTarget: EventTarget|null = null;
		const onElectronContextMenu = (event: ElectronEvent, params: ContextMenuParams) => {
			if (!lastTarget) return;
			const element = lastTarget as HTMLElement;
			lastTarget = null;

			event.preventDefault();
			showContextMenu(element, params.misspelledWord, params.dictionarySuggestions);
		};

		const onBrowserContextMenu = (event: PointerEvent) => {
			const isKeyboard = event.buttons === 0;
			if (isKeyboard) {
				// Context menu events from the keyboard seem to always use <body> as the
				// event target. Since which context menu is displayed depends on what the
				// target is, using event.target for keyboard-triggered contextmenu events
				// would prevent keyboard-only users from accessing certain functionality.
				// To fix this, use the selection instead.
				lastTarget = editor.selection.getNode();
			} else {
				lastTarget = event.target;
			}

			// Plugins in the Rich Text Editor (e.g. the mermaid renderer) can sometimes
			// create custom right-click events. These don't trigger the Electron 'context-menu'
			// event. As such, the context menu must be shown manually.
			const isFromPlugin = !event.isTrusted;
			if (isFromPlugin) {
				event.preventDefault();
				showContextMenu(lastTarget as HTMLElement, null, []);
				lastTarget = null;
			}
		};

		targetWindow.webContents.prependListener('context-menu', onElectronContextMenu);
		editor.on('contextmenu', onBrowserContextMenu);

		return () => {
			editor.off('contextmenu', onBrowserContextMenu);
			if (!targetWindow.isDestroyed() && targetWindow?.webContents?.off) {
				targetWindow.webContents.off('context-menu', onElectronContextMenu);
			}
		};
	}, [editor, plugins, dispatch, htmlToMd, mdToHtml, editDialog]);
}
