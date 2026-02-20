import { ContextMenuParams, Event } from 'electron';
import { useEffect, RefObject, useContext } from 'react';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import type CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import bridge from '../../../../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import Resource from '@joplin/lib/models/Resource';
import { ContextMenuItemType, ContextMenuOptions, buildMenuItems, handleEditorContextMenuFilter } from '../../../utils/contextMenuUtils';
import { menuItems } from '../../../utils/contextMenu';
import isItemId from '@joplin/lib/models/utils/isItemId';
import { extractResourceUrls } from '@joplin/lib/urlUtils';
import { WindowIdContext } from '../../../../NewWindowOrIFrame';

export type ResourceMarkupType = 'image' | 'file';

export interface ResourceMarkupInfo {
	resourceId: string;
	type: ResourceMarkupType;
}

// Extract resource ID from resource markup (images or file attachments) at a given cursor position within a line.
// Returns the resource ID and its type if the cursor is within a resource markup, null otherwise.
export const getResourceIdFromMarkup = (lineContent: string, cursorPosInLine: number): ResourceMarkupInfo | null => {
	const resourceUrls = extractResourceUrls(lineContent);
	if (!resourceUrls.length) return null;

	for (const resourceInfo of resourceUrls) {
		const resourcePattern = new RegExp(`[:](/?${resourceInfo.itemId})`, 'g');
		let match;
		while ((match = resourcePattern.exec(lineContent)) !== null) {
			// Look backwards for ![, [, <img, or <a
			const imageMarkupStart = lineContent.lastIndexOf('![', match.index);
			const linkMarkupStart = lineContent.lastIndexOf('[', match.index);
			const imgTagStart = lineContent.lastIndexOf('<img', match.index);
			const aTagStart = lineContent.lastIndexOf('<a', match.index);

			// Find the closest markup start and determine type
			let markupStart = -1;
			let markupType: ResourceMarkupType = 'file';

			if (imageMarkupStart !== -1 && imageMarkupStart > markupStart) {
				markupStart = imageMarkupStart;
				markupType = 'image';
			}
			if (linkMarkupStart !== -1 && linkMarkupStart > markupStart && lineContent[linkMarkupStart - 1] !== '!') {
				markupStart = linkMarkupStart;
				markupType = 'file';
			}
			if (imgTagStart !== -1 && imgTagStart > markupStart) {
				markupStart = imgTagStart;
				markupType = 'image';
			}
			if (aTagStart !== -1 && aTagStart > markupStart) {
				markupStart = aTagStart;
				markupType = 'file';
			}

			if (markupStart === -1) continue;

			// Find the end of the markup
			let markupEnd: number;
			if (lineContent[markupStart] === '!' || lineContent[markupStart] === '[') {
				markupEnd = lineContent.indexOf(')', match.index);
				if (markupEnd !== -1) markupEnd += 1;
			} else {
				markupEnd = lineContent.indexOf('>', match.index);
				if (markupEnd !== -1) markupEnd += 1;
			}

			if (markupEnd !== -1 && cursorPosInLine >= markupStart && cursorPosInLine <= markupEnd) {
				return { resourceId: resourceInfo.itemId, type: markupType };
			}
		}
	}

	return null;
};

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const menuUtils = new MenuUtils(CommandService.instance());

const imageClassName = 'cm-md-image';

// Shared helper to extract resource ID from a path/URL
const pathToId = (path: string) => {
	const id = Resource.pathToId(path);
	return isItemId(id) ? id : '';
};

interface ContextMenuProps {
	plugins: PluginStates;
	dispatch: Dispatch;
	editorCutText: ()=> void;
	editorCopyText: ()=> void;
	editorPaste: ()=> void;
	editorRef: RefObject<CodeMirrorControl>;
	editorClassName: string;
	containerRef: RefObject<HTMLDivElement|null>;
}

const useContextMenu = (props: ContextMenuProps) => {
	const editorRef = props.editorRef;
	const windowId = useContext(WindowIdContext);

	// The below code adds support for spellchecking when it is enabled
	// It might be buggy, refer to the below issue
	// https://github.com/laurent22/joplin/pull/3974#issuecomment-718936703
	useEffect(() => {
		const isAncestorOfCodeMirrorEditor = (elem: Element) => {
			for (; elem.parentElement; elem = elem.parentElement) {
				if (elem.classList.contains(props.editorClassName)) {
					return true;
				}
			}

			return false;
		};

		const convertFromScreenCoordinates = (zoomPercent: number, screenXY: number) => {
			const zoomFraction = zoomPercent / 100;
			return screenXY / zoomFraction;
		};

		const pointerInsideEditor = (params: ContextMenuParams, allowNonEditable = false) => {
			const x = params.x, y = params.y, isEditable = params.isEditable;
			const containerDoc = props.containerRef.current?.ownerDocument;
			const elements = containerDoc?.getElementsByClassName(props.editorClassName);

			// Note: We can't check inputFieldType here. When spellcheck is enabled,
			// params.inputFieldType is "none". When spellcheck is disabled,
			// params.inputFieldType is "plainText". Thus, such a check would be inconsistent.
			if (!elements?.length || (!isEditable && !allowNonEditable)) return false;

			// Checks whether the element the pointer clicked on is inside the editor.
			// This logic will need to be changed if the editor is eventually wrapped
			// in an iframe, as elementFromPoint will return the iframe container (and not
			// a child of the editor).
			const zoom = Setting.value('windowContentZoomFactor');
			const xScreen = convertFromScreenCoordinates(zoom, x);
			const yScreen = convertFromScreenCoordinates(zoom, y);
			const intersectingElement = containerDoc.elementFromPoint(xScreen, yScreen);
			return intersectingElement && isAncestorOfCodeMirrorEditor(intersectingElement);
		};

		const getClickedImageContainer = (params: ContextMenuParams) => {
			const containerDoc = props.containerRef.current?.ownerDocument;
			if (!containerDoc) return null;

			const zoom = Setting.value('windowContentZoomFactor');
			const xScreen = convertFromScreenCoordinates(zoom, params.x);
			const yScreen = convertFromScreenCoordinates(zoom, params.y);
			const clickedElement = containerDoc.elementFromPoint(xScreen, yScreen);

			return clickedElement?.closest(`.${imageClassName}`) as HTMLElement | null;
		};

		// Get resource info from markup at click position (not cursor position)
		const getResourceInfoAtClickPos = (params: ContextMenuParams): ResourceMarkupInfo | null => {
			if (!editorRef.current) return null;

			const editor = editorRef.current.editor;
			if (!editor) return null;

			const zoom = Setting.value('windowContentZoomFactor');
			const x = convertFromScreenCoordinates(zoom, params.x);
			const y = convertFromScreenCoordinates(zoom, params.y);

			const clickPos = editor.posAtCoords({ x, y });
			if (clickPos === null) return null;

			const line = editor.state.doc.lineAt(clickPos);
			return getResourceIdFromMarkup(line.text, clickPos - line.from);
		};

		const targetWindow = bridge().windowById(windowId);

		const showResourceContextMenu = async (resourceId: string, type: ResourceMarkupType) => {
			const menu = new Menu();
			const contextMenuOptions: ContextMenuOptions = {
				itemType: type === 'image' ? ContextMenuItemType.Image : ContextMenuItemType.Resource,
				resourceId,
				filename: null,
				mime: null,
				linkToCopy: null,
				linkToOpen: null,
				textToCopy: null,
				htmlToCopy: null,
				insertContent: () => {},
				isReadOnly: true,
				fireEditorEvent: () => {},
				htmlToMd: null,
				mdToHtml: null,
			};

			const resourceMenuItems = await buildMenuItems(menuItems(props.dispatch), contextMenuOptions);
			for (const item of resourceMenuItems) {
				menu.append(item);
			}

			menu.popup({ window: targetWindow });
		};

		// Move the cursor to the line containing the image markup for a rendered image.
		// This ensures plugins that inspect cursor position (e.g. rich markdown, image resize)
		// show the correct context menu options.
		const moveCursorToImageLine = (imageContainer: HTMLElement) => {
			const editor = editorRef.current?.editor;
			if (!editor) return;

			// The image widget stores its source document position as a data attribute.
			const sourceFrom = imageContainer.dataset.sourceFrom;
			if (sourceFrom === undefined) return;

			const pos = Math.min(Number(sourceFrom), editor.state.doc.length);
			const line = editor.state.doc.lineAt(pos);
			editor.dispatch({
				selection: { anchor: line.from },
			});
		};

		const onContextMenu = async (event: Event, params: ContextMenuParams) => {
			// Check if right-clicking on a rendered image first (images may not be "editable")
			const imageContainer = getClickedImageContainer(params);
			if (imageContainer && pointerInsideEditor(params, true)) {
				const imgElement = imageContainer.querySelector('img');
				if (imgElement) {
					const resourceId = pathToId(imgElement.src);
					if (resourceId) {
						event.preventDefault();
						moveCursorToImageLine(imageContainer);
						await showResourceContextMenu(resourceId, 'image');
						return;
					}
				}
			}

			// Check if right-clicking on resource markup text (images or file attachments)
			const markupResourceInfo = getResourceInfoAtClickPos(params);
			if (markupResourceInfo && pointerInsideEditor(params)) {
				event.preventDefault();
				await showResourceContextMenu(markupResourceInfo.resourceId, markupResourceInfo.type);
				return;
			}

			// For text context menu, require editable
			if (!pointerInsideEditor(params)) return;

			// Don't show the default menu.
			event.preventDefault();

			const menu = new Menu();

			const hasSelectedText = editorRef.current && !!editorRef.current.getSelection() ;

			menu.append(
				new MenuItem({
					label: _('Cut'),
					enabled: hasSelectedText,
					click: async () => {
						props.editorCutText();
					},
				}),
			);

			menu.append(
				new MenuItem({
					label: _('Copy'),
					enabled: hasSelectedText,
					click: async () => {
						props.editorCopyText();
					},
				}),
			);

			menu.append(
				new MenuItem({
					label: _('Paste'),
					enabled: true,
					click: async () => {
						props.editorPaste();
					},
				}),
			);

			const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(params.misspelledWord, params.dictionarySuggestions);

			for (const item of spellCheckerMenuItems) {
				menu.append(new MenuItem(item));
			}

			// CodeMirror 5 only:
			// Typically CodeMirror handles all interactions itself (highlighting etc.)
			// But in the case of clicking a misspelled word, we need electron to handle the click
			// The result is that CodeMirror doesn't know what's been selected and doesn't
			// move the cursor into the correct location.
			// and when the user selects a new spelling it will be inserted in the wrong location
			// So in this situation, we use must manually align the internal codemirror selection
			// to the contextmenu selection
			if (editorRef.current && !editorRef.current.cm6 && spellCheckerMenuItems.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(editorRef.current as any).alignSelection(params);
			}

			const extraItems = await handleEditorContextMenuFilter({
				itemType: ContextMenuItemType.Text,
			});

			if (extraItems.length) {
				menu.append(new MenuItem({
					type: 'separator',
				}));
			}

			for (const extraItem of extraItems) {
				menu.append(extraItem);
			}

			// eslint-disable-next-line github/array-foreach, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
			menuUtils.pluginContextMenuItems(props.plugins, MenuItemLocation.EditorContextMenu).forEach((item: any) => {
				menu.append(new MenuItem(item));
			});

			menu.popup({ window: targetWindow });
		};

		// Prepend the event listener so that it gets called before
		// the listener that shows the default menu.
		targetWindow.webContents.prependListener('context-menu', onContextMenu);

		return () => {
			if (!targetWindow.isDestroyed()) {
				targetWindow.webContents.off('context-menu', onContextMenu);
			}
		};
	}, [
		props.plugins, props.dispatch, props.editorClassName, editorRef, props.containerRef,
		props.editorCutText, props.editorCopyText, props.editorPaste,
		windowId,
	]);
};

export default useContextMenu;
