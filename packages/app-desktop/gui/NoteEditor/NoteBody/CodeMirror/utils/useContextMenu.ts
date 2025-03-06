
import { ContextMenuParams, Event } from 'electron';
import { useEffect, RefObject } from 'react';
import { _ } from '@joplin/lib/locale';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { EditContextMenuFilterObject, MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import SpellCheckerService from '@joplin/lib/services/spellChecker/SpellCheckerService';
import type CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import eventManager from '@joplin/lib/eventManager';
import bridge from '../../../../../services/bridge';
import Setting from '@joplin/lib/models/Setting';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const menuUtils = new MenuUtils(CommandService.instance());


interface ContextMenuProps {
	plugins: PluginStates;
	editorCutText: ()=> void;
	editorCopyText: ()=> void;
	editorPaste: ()=> void;
	editorRef: RefObject<CodeMirrorControl>;
	editorClassName: string;
	containerRef: RefObject<HTMLDivElement|null>;
}

const useContextMenu = (props: ContextMenuProps) => {
	const editorRef = props.editorRef;

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

		function pointerInsideEditor(params: ContextMenuParams) {
			const x = params.x, y = params.y, isEditable = params.isEditable;
			const containerDoc = props.containerRef.current?.ownerDocument;
			const elements = containerDoc?.getElementsByClassName(props.editorClassName);

			// Note: We can't check inputFieldType here. When spellcheck is enabled,
			// params.inputFieldType is "none". When spellcheck is disabled,
			// params.inputFieldType is "plainText". Thus, such a check would be inconsistent.
			if (!elements?.length || !isEditable) return false;

			// Checks whether the element the pointer clicked on is inside the editor.
			// This logic will need to be changed if the editor is eventually wrapped
			// in an iframe, as elementFromPoint will return the iframe container (and not
			// a child of the editor).
			const zoom = Setting.value('windowContentZoomFactor');
			const xScreen = convertFromScreenCoordinates(zoom, x);
			const yScreen = convertFromScreenCoordinates(zoom, y);
			const intersectingElement = containerDoc.elementFromPoint(xScreen, yScreen);
			return intersectingElement && isAncestorOfCodeMirrorEditor(intersectingElement);
		}

		async function onContextMenu(event: Event, params: ContextMenuParams) {
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

			let filterObject: EditContextMenuFilterObject = {
				items: [],
			};

			filterObject = await eventManager.filterEmit('editorContextMenu', filterObject);

			for (const item of filterObject.items) {
				menu.append(new MenuItem({
					label: item.label,
					click: async () => {
						const args = item.commandArgs || [];
						void CommandService.instance().execute(item.commandName, ...args);
					},
					type: item.type,
				}));
			}

			// eslint-disable-next-line github/array-foreach, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
			menuUtils.pluginContextMenuItems(props.plugins, MenuItemLocation.EditorContextMenu).forEach((item: any) => {
				menu.append(new MenuItem(item));
			});

			menu.popup({ window: bridge().activeWindow() });
		}

		// Prepend the event listener so that it gets called before
		// the listener that shows the default menu.
		const targetWindow = bridge().activeWindow();
		targetWindow.webContents.prependListener('context-menu', onContextMenu);

		return () => {
			if (!targetWindow.isDestroyed()) {
				targetWindow.webContents.off('context-menu', onContextMenu);
			}
		};
	}, [
		props.plugins, props.editorClassName, editorRef, props.containerRef,
		props.editorCutText, props.editorCopyText, props.editorPaste,
	]);
};

export default useContextMenu;
