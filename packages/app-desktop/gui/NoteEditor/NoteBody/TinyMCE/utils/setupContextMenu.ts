import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import bridge from '../../../../../services/bridge';
import { menuItems, ContextMenuOptions, ContextMenuItemType } from '../../../utils/contextMenu';
const Resource = require('@joplin/lib/models/Resource');

// x and y are the absolute coordinates, as returned by the context-menu event
// handler on the webContent. This function will return null if the point is
// not within the TinyMCE editor.
function contextMenuElement(editor: any, x: number, y: number) {
	if (!editor || !editor.getDoc()) return null;

	const iframes = document.getElementsByClassName('tox-edit-area__iframe');
	if (!iframes.length) return null;

	const iframeRect = iframes[0].getBoundingClientRect();

	if (iframeRect.x < x && iframeRect.y < y && iframeRect.right > x && iframeRect.bottom > y) {
		const relativeX = x - iframeRect.x;
		const relativeY = y - iframeRect.y;
		return editor.getDoc().elementFromPoint(relativeX, relativeY);
	}

	return null;
}

interface ContextMenuActionOptions {
	current: ContextMenuOptions;
}

const contextMenuActionOptions: ContextMenuActionOptions = { current: null };

export default function(editor: any) {
	const contextMenuItems = menuItems();

	bridge().window().webContents.on('context-menu', (_event: any, params: any) => {
		const element = contextMenuElement(editor, params.x, params.y);
		if (!element) return;

		let itemType: ContextMenuItemType = ContextMenuItemType.None;
		let resourceId = '';
		let linkToCopy = null;

		if (element.nodeName === 'IMG') {
			itemType = ContextMenuItemType.Image;
			resourceId = Resource.pathToId(element.src);
		} else if (element.nodeName === 'A') {
			resourceId = Resource.pathToId(element.href);
			itemType = resourceId ? ContextMenuItemType.Resource : ContextMenuItemType.Link;
			linkToCopy = element.getAttribute('href') || '';
		} else {
			itemType = ContextMenuItemType.Text;
		}

		contextMenuActionOptions.current = {
			itemType,
			resourceId,
			linkToCopy,
			textToCopy: null,
			htmlToCopy: editor.selection ? editor.selection.getContent() : '',
			insertContent: (content: string) => {
				editor.insertContent(content);
			},
			isReadOnly: false,
		};

		const template = [];

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

		const menu = bridge().Menu.buildFromTemplate(template);
		menu.popup(bridge().window());
	});
}
