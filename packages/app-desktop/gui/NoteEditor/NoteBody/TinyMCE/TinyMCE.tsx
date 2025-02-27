import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { ScrollOptions, ScrollOptionTypes, EditorCommand, NoteBodyEditorProps, ResourceInfos, HtmlToMarkdownHandler, ScrollToTextValue } from '../../utils/types';
import { resourcesStatus, commandAttachFileToBody, getResourcesFromPasteEvent, processPastedHtml } from '../../utils/resourceHandling';
import attachedResources from '@joplin/lib/utils/attachedResources';
import useScroll from './utils/useScroll';
import styles_ from './styles';
import CommandService from '@joplin/lib/services/CommandService';
import { ToolbarItem } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import ToggleEditorsButton, { Value as ToggleEditorsButtonValue } from '../../../ToggleEditorsButton/ToggleEditorsButton';
import ToolbarButton from '../../../../gui/ToolbarButton/ToolbarButton';
import usePluginServiceRegistration from '../../utils/usePluginServiceRegistration';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { _, closestSupportedLocale } from '@joplin/lib/locale';
import useContextMenu from './utils/useContextMenu';
import { copyHtmlToClipboard } from '../../utils/clipboardUtils';
import shim from '@joplin/lib/shim';
import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import BaseItem from '@joplin/lib/models/BaseItem';
import setupToolbarButtons from './utils/setupToolbarButtons';
import { plainTextToHtml } from '@joplin/lib/htmlUtils';
import { themeStyle } from '@joplin/lib/theme';
import { loadScript } from '../../../utils/loadScript';
import bridge from '../../../../services/bridge';
import { TinyMceEditorEvents } from './utils/types';
import type { Editor, EditorEvent } from 'tinymce';
import { joplinCommandToTinyMceCommands, TinyMceCommand } from './utils/joplinCommandToTinyMceCommands';
import shouldPasteResources from './utils/shouldPasteResources';
import lightTheme from '@joplin/lib/themes/light';
import { Options as NoteStyleOptions } from '@joplin/renderer/noteStyle';
import markupRenderOptions from '../../utils/markupRenderOptions';
import { DropHandler } from '../../utils/useDropHandler';
import Logger from '@joplin/utils/Logger';
import useWebViewApi from './utils/useWebViewApi';
import useLinkTooltips from './utils/useLinkTooltips';
import { focus } from '@joplin/lib/utils/focusHandler';
const md5 = require('md5');
const { clipboard } = require('electron');
const supportedLocales = require('./supportedLocales');
import { hasProtocol } from '@joplin/utils/url';
import useTabIndenter from './utils/useTabIndenter';
import useKeyboardRefocusHandler from './utils/useKeyboardRefocusHandler';
import useDocument from '../../../hooks/useDocument';
import useEditDialog from './utils/useEditDialog';
import useEditDialogEventListeners from './utils/useEditDialogEventListeners';

const logger = Logger.create('TinyMCE');

// In TinyMCE 5.2, when setting the body to '<div id="rendered-md"></div>',
// it would end up as '<div id="rendered-md"><br/></div>' once rendered
// (an additional <br/> was inserted).
//
// This behaviour was "fixed" later on, possibly in 5.6, which has this change:
//
// - Fixed getContent with text format returning a new line when the editor is empty #TINY-6281
//
// The problem is that the list plugin was, unknown to me, relying on this <br/>
// being present. Without it, trying to add a bullet point or checkbox on an
// empty document, does nothing. The exact reason for this is unclear
// so as a workaround we manually add this <br> for empty documents,
// which fixes the issue.
//
// However,
//    <div id="rendered-md"><br/></div>
// breaks newline behaviour in new notes (see https://github.com/laurent22/joplin/issues/9786).
// Thus, we instead use
//    <div id="rendered-md"><p></p></div>
// which also seems to work around the list issue.
//
// Perhaps upgrading the list plugin (which is a fork of TinyMCE own list plugin)
// would help?
function awfulInitHack(html: string): string {
	return html === '<div id="rendered-md"></div>' ? '<div id="rendered-md"><p></p></div>' : html;
}


let markupToHtml_ = new MarkupToHtml();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function stripMarkup(markupLanguage: number, markup: string, options: any = null) {
	if (!markupToHtml_) markupToHtml_ = new MarkupToHtml();
	return	markupToHtml_.stripMarkup(markupLanguage, markup, options);
}

interface LastOnChangeEventInfo {
	content: string;
	resourceInfos: ResourceInfos;
	contentKey: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let dispatchDidUpdateIID_: any = null;
let changeId_ = 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const TinyMCE = (props: NoteBodyEditorProps, ref: any) => {
	const [editorContainer, setEditorContainer] = useState<HTMLDivElement|null>(null);
	const editorContainerDom = useDocument(editorContainer);
	const [editor, setEditor] = useState<Editor|null>(null);
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const [editorReady, setEditorReady] = useState(false);
	const [draggingStarted, setDraggingStarted] = useState(false);

	const props_onMessage = useRef(null);
	props_onMessage.current = props.onMessage;

	const props_onDrop = useRef<DropHandler|null>(null);
	props_onDrop.current = props.onDrop;

	const markupToHtml = useRef(null);
	markupToHtml.current = props.markupToHtml;

	const lastOnChangeEventInfo = useRef<LastOnChangeEventInfo>({
		content: null,
		resourceInfos: null,
		contentKey: null,
	});

	const editorRef = useRef<Editor>(null);
	editorRef.current = editor;

	const styles = styles_(props);
	// const theme = themeStyle(props.themeId);

	const { scrollToPercent } = useScroll({ editor, onScroll: props.onScroll });

	const dispatchDidUpdate = useCallback((editor: Editor) => {
		if (dispatchDidUpdateIID_) shim.clearTimeout(dispatchDidUpdateIID_);
		dispatchDidUpdateIID_ = shim.setTimeout(() => {
			dispatchDidUpdateIID_ = null;
			if (editor && editor.getDoc()) editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
		}, 10);
	}, []);

	const editDialog = useEditDialog({ editor, markupToHtml, dispatchDidUpdate });
	const editDialogRef = useRef(editDialog);
	editDialogRef.current = editDialog;

	useEditDialogEventListeners(editor, editDialog);
	usePluginServiceRegistration(ref);
	useContextMenu(editor, props.plugins, props.dispatch, props.htmlToMarkdown, props.markupToHtml, editDialog);
	useTabIndenter(editor, !props.tabMovesFocus);
	useKeyboardRefocusHandler(editor);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const insertResourcesIntoContent = useCallback(async (filePaths: string[] = null, options: any = null) => {
		const resourceMd = await commandAttachFileToBody('', filePaths, options);
		if (!resourceMd) return;
		const result = await props.markupToHtml(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resourceMd, markupRenderOptions({ bodyOnly: true }));
		editor.insertContent(result.html);
	}, [props.markupToHtml, editor]);

	const insertResourcesIntoContentRef = useRef(null);
	insertResourcesIntoContentRef.current = insertResourcesIntoContent;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onEditorContentClick = useCallback((event: any) => {
		const nodeName = event.target ? event.target.nodeName : '';

		if (nodeName === 'INPUT' && event.target.getAttribute('type') === 'checkbox') {
			editor.fire(TinyMceEditorEvents.JoplinChange);
			dispatchDidUpdate(editor);
		}

		if (nodeName === 'A' && (event.ctrlKey || event.metaKey)) {
			const href = event.target.getAttribute('href');

			if (href.indexOf('#') === 0) {
				const anchorName = href.substr(1);
				const anchor = editor.getDoc().getElementById(anchorName);
				if (anchor) {
					anchor.scrollIntoView();
				} else {
					logger.warn('could not find anchor with ID ', anchorName);
				}
			} else {
				props.onMessage({ channel: href });
			}
		}
	}, [editor, props.onMessage, dispatchDidUpdate]);

	useImperativeHandle(ref, () => {
		return {
			content: async () => {
				if (!editorRef.current) return '';
				return prop_htmlToMarkdownRef.current(props.contentMarkupLanguage, editorRef.current.getContent(), props.contentOriginalCss);
			},
			resetScroll: () => {
				if (editor) editor.getWin().scrollTo(0, 0);
			},
			scrollTo: (options: ScrollOptions) => {
				if (!editor) return;

				if (options.type === ScrollOptionTypes.Hash) {
					const anchor = editor.getDoc().getElementById(options.value);
					if (!anchor) {
						console.warn('Cannot find hash', options);
						return;
					}
					anchor.scrollIntoView();
				} else if (options.type === ScrollOptionTypes.Percent) {
					scrollToPercent(options.value);
				} else {
					throw new Error(`Unsupported scroll options: ${options.type}`);
				}
			},
			supportsCommand: (name: string) => {
				// TODO: should also handle commands that are not in this map (insertText, focus, etc);
				return !!joplinCommandToTinyMceCommands[name];
			},
			execCommand: async (cmd: EditorCommand) => {
				if (!editor) return false;

				logger.debug('execCommand', cmd);

				let commandProcessed = true;

				if (cmd.name === 'insertText') {
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, cmd.value, markupRenderOptions({ bodyOnly: true }));
					editor.insertContent(result.html);
				} else if (cmd.name === 'editor.focus') {
					focus('TinyMCE::editor.focus', editor);
					if (cmd.value?.moveCursorToStart) {
						editor.selection.placeCaretAt(0, 0);
						editor.selection.setCursorLocation(
							editor.dom.root,
							0,
						);
					}
				} else if (cmd.name === 'editor.execCommand') {
					if (!('ui' in cmd.value)) cmd.value.ui = false;
					if (!('value' in cmd.value)) cmd.value.value = null;
					if (!('args' in cmd.value)) cmd.value.args = {};

					editor.execCommand(cmd.value.name, cmd.value.ui, cmd.value.value, cmd.value.args);
				} else if (cmd.name === 'dropItems') {
					if (cmd.value.type === 'notes') {
						const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, cmd.value.markdownTags.join('\n'), markupRenderOptions({ bodyOnly: true }));
						editor.insertContent(result.html);
					} else if (cmd.value.type === 'files') {
						insertResourcesIntoContentRef.current(cmd.value.paths, { createFileURL: !!cmd.value.createFileURL });
					} else {
						logger.warn('unsupported drop item: ', cmd);
					}
				} else if (cmd.name === 'editor.scrollToText') {

					const cmdValue = cmd.value as ScrollToTextValue;

					const findElementByText = (doc: Document, text: string, element: string) => {
						const headers = doc.querySelectorAll(element);
						for (const header of headers) {
							if (header.textContent?.trim() === text) {
								return header;
							}
						}
						return null;
					};

					const contentDocument = editor.getDoc();
					const targetElement = findElementByText(contentDocument, cmdValue.text, cmdValue.element);

					if (targetElement) {
						targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
					} else {
						logger.warn('editor.scrollToText: Could not find text to scroll to :', cmdValue);
					}
				} else {
					commandProcessed = false;
				}

				if (commandProcessed) return true;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				const additionalCommands: any = {
					selectedText: () => {
						return stripMarkup(MarkupToHtml.MARKUP_LANGUAGE_HTML, editor.selection.getContent());
					},
					selectedHtml: () => {
						return editor.selection.getContent();
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					replaceSelection: (value: any) => {
						editor.selection.setContent(value);
						editor.fire(TinyMceEditorEvents.JoplinChange);
						dispatchDidUpdate(editor);

						// It doesn't make sense but it seems calling setContent
						// doesn't create an undo step so we need to call it
						// manually.
						// https://github.com/tinymce/tinymce/issues/3745
						window.requestAnimationFrame(() => editor.undoManager.add());
					},
					pasteAsText: () => editor.fire(TinyMceEditorEvents.PasteAsText),
				};

				if (additionalCommands[cmd.name]) {
					return additionalCommands[cmd.name](cmd.value);
				}

				if (!joplinCommandToTinyMceCommands[cmd.name]) {
					logger.warn('unsupported Joplin command: ', cmd);
					return false;
				}

				if (joplinCommandToTinyMceCommands[cmd.name] === true) {
					// Already handled in useWindowCommandHandlers.ts
				} else if (joplinCommandToTinyMceCommands[cmd.name] === false) {
					// explicitly not supported
				} else {
					const tinyMceCmd: TinyMceCommand = { ...(joplinCommandToTinyMceCommands[cmd.name] as TinyMceCommand) };
					if (!('ui' in tinyMceCmd)) tinyMceCmd.ui = false;
					if (!('value' in tinyMceCmd)) tinyMceCmd.value = null;

					editor.execCommand(tinyMceCmd.name, tinyMceCmd.ui, tinyMceCmd.value);
				}

				return true;
			},
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [editor, props.contentMarkupLanguage, props.contentOriginalCss]);

	// -----------------------------------------------------------------------------------------
	// Load the TinyMCE library. The lib loads additional JS and CSS files on startup
	// (for themes), and so it needs to be loaded via <script> tag. Requiring it from the
	// module would not load these extra files.
	// -----------------------------------------------------------------------------------------

	// const loadScript = async (script: any) => {
	// 	return new Promise((resolve) => {
	// 		let element: any = document.createElement('script');
	// 		if (script.src.indexOf('.css') >= 0) {
	// 			element = document.createElement('link');
	// 			element.rel = 'stylesheet';
	// 			element.href = script.src;
	// 		} else {
	// 			element.src = script.src;

	// 			if (script.attrs) {
	// 				for (const attr in script.attrs) {
	// 					element[attr] = script.attrs[attr];
	// 				}
	// 			}
	// 		}

	// 		element.id = script.id;

	// 		element.onload = () => {
	// 			resolve(null);
	// 		};

	// 		document.getElementsByTagName('head')[0].appendChild(element);
	// 	});
	// };

	useEffect(() => {
		if (!editorContainerDom) return () => {};

		let cancelled = false;

		async function loadScripts() {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const scriptsToLoad: any[] = [
				{
					src: `${bridge().vendorDir()}/lib/tinymce/tinymce.min.js`,
					id: 'tinyMceScript',
					loaded: false,
				},
				{
					src: 'gui/NoteEditor/NoteBody/TinyMCE/plugins/lists.js',
					id: 'tinyMceListsPluginScript',
					loaded: false,
				},
			];

			for (const s of scriptsToLoad) {
				if (editorContainerDom.getElementById(s.id)) {
					s.loaded = true;
					continue;
				}

				// eslint-disable-next-line no-console
				console.info('Loading script', s.src);

				await loadScript(s, editorContainerDom);
				if (cancelled) return;

				s.loaded = true;
			}

			setScriptLoaded(true);
		}

		void loadScripts();

		return () => {
			cancelled = true;
		};
	}, [editorContainerDom]);

	useWebViewApi(editor, editorContainerDom?.defaultView);
	const { resetModifiedTitles: resetLinkTooltips } = useLinkTooltips(editor);

	useEffect(() => {
		if (!editorContainerDom) return () => {};
		const theme = themeStyle(props.themeId);
		const backgroundColor = props.whiteBackgroundNoteRendering ? lightTheme.backgroundColor : theme.backgroundColor;

		const element = editorContainerDom.createElement('style');
		element.setAttribute('id', 'tinyMceStyle');
		editorContainerDom.head.appendChild(element);
		element.appendChild(editorContainerDom.createTextNode(`
			.joplin-tinymce .tox-editor-header.tox-editor-header {
				margin-left: ${styles.leftExtraToolbarContainer.width + styles.leftExtraToolbarContainer.padding * 2}px;
				margin-right: ${styles.rightExtraToolbarContainer.width + styles.rightExtraToolbarContainer.padding * 2}px;
				padding: 0;
				box-shadow: none;
			}
			
			.tox .tox-toolbar,
			.tox .tox-toolbar__overflow,
			.tox .tox-toolbar__primary,
			.tox-editor-header .tox-toolbar__primary,
			.tox .tox-toolbar-overlord,
			.tox.tox-tinymce-aux .tox-toolbar__overflow,
			.tox .tox-statusbar,
			.tox .tox-dialog__header,
			.tox .tox-dialog,
			.tox textarea,
			.tox input,
			.tox .tox-menu,
			.tox .tox-dialog__footer {
				background-color: ${theme.backgroundColor} !important;
			}

			.tox .tox-dialog__body-content,
			.tox .tox-collection__item,
			.tox .tox-insert-table-picker__label {
				color: ${theme.color};
			}

			.tox .tox-dialog__body-nav-item {
				color: ${theme.color};
			}

			.tox .tox-dialog__body-nav-item[aria-selected=true] {
				color: ${theme.color3};
				border-color: ${theme.color3};
				background-color: ${theme.backgroundColor3};
			}

			.tox .tox-checkbox__icons .tox-checkbox-icon__unchecked svg {
				fill: ${theme.color};
			}

			.tox .tox-collection--list .tox-collection__item--active {
				color: ${theme.backgroundColor};
			}

			.tox .tox-collection__item--state-disabled {
				opacity: 0.7;
			}

			.tox .tox-menu {
				/* Ensures that popover menus (the color swatch menu) has a visible border
				   even in dark mode. */
				border: 1px solid rgba(140, 140, 140, 0.3);
			}

			/*
			When creating dialogs, TinyMCE doesn't seem to offer a way to style the components or to assign classes to them.
			We want the code dialog box text area to be monospace, and since we can't target this precisely, we apply the style
			to all textareas of all dialogs. As I think only the code dialog displays a textarea that should be fine.
			*/
			
			.tox .tox-dialog textarea {
				font-family: Menlo, Monaco, Consolas, "Courier New", monospace !important;
			}

			.tox .tox-dialog-wrap__backdrop {
				background-color: ${theme.backgroundColor} !important;
				opacity:0.7
			}
			
			.tox .tox-editor-header {
				border: none;
			}

			.tox .tox-tbtn,
			.tox .tox-tbtn svg,
			.tox .tox-menu button > svg,
			.tox .tox-split-button,
			.tox .tox-dialog__header,
			.tox .tox-button--icon .tox-icon svg,
			.tox .tox-button.tox-button--icon .tox-icon svg,
			.tox textarea,
			.tox input,
			.tox .tox-label,
			.tox .tox-toolbar-label {
				color: ${theme.color3} !important;
				fill: ${theme.color3} !important;
				background: transparent;
			}

			.tox .tox-statusbar a,
			.tox .tox-statusbar__path-item,
			.tox .tox-statusbar__wordcount,
			.tox .tox-statusbar__path-divider {
				color: ${theme.color};
				fill: ${theme.color};
				opacity: 0.7;
			}

			.tox .tox-tbtn--enabled,
			.tox .tox-tbtn--enabled:hover,
			.tox .tox-menu button:hover,
			.tox .tox-split-button {
				background-color: ${theme.selectedColor};
			}

			.tox .tox-button--naked:hover:not(:disabled) {
				background-color: ${theme.backgroundColor} !important;
			}
			
			.tox .tox-tbtn:focus,
			.tox .tox-split-button:focus {
				background-color: ${theme.backgroundColor3}
			}

			.tox .tox-tbtn:focus-visible,
			.tox .tox-split-button:focus-visible {
				background-color: ${theme.backgroundColorHover3}
			}
			
			.tox .tox-tbtn:hover,
			.tox .tox-menu button:hover > svg {
				color: ${theme.colorHover3} !important;
				fill: ${theme.colorHover3} !important;
				background-color: ${theme.backgroundColorHover3}
			}			
			

			.tox .tox-tbtn {
				height: ${theme.toolbarHeight}px;
				min-height: ${theme.toolbarHeight}px;
				margin: 0;
			}


			.tox .tox-tbtn[aria-haspopup=true] {
				width: ${theme.toolbarHeight + 15}px;
				min-width: ${theme.toolbarHeight + 15}px;
			}

			.tox .tox-tbtn > span,
			.tox .tox-tbtn:active > span,
			.tox .tox-tbtn:hover > span {
				transform: scale(0.8);
			}

			.tox .tox-toolbar__primary,
			.tox .tox-toolbar__overflow {
				background: none;
				background-color: ${theme.backgroundColor3} !important;
			}

			.tox .tox-split-button:hover {
				box-shadow: none;
			}
			
			/* Decrease the spacing between groups */
			.tox .tox-toolbar__group {
				padding-left: 7px;
				padding-right: 7px;
			}

			.tox-tinymce,
			.tox .tox-toolbar__group,
			.tox.tox-tinymce-aux .tox-toolbar__overflow,
			.tox .tox-dialog__footer {
				border: none !important;
			}

			.tox-tinymce {
				border-top: none !important;
			}

			/* Override the TinyMCE font styles with more specific CSS selectors.
			   Without this, the built-in FontAwesome styles are not applied because
			   they are overridden by TinyMCE. */
			.plugin-icon.fa, .plugin-icon.far, .plugin-icon.fas {
				font-family: "Font Awesome 5 Free";
				font-size: ${theme.toolbarHeight - theme.toolbarPadding}px;
			}
			
			.plugin-icon.fa, .plugin-icon.fas {
				font-weight: 900;
			}

			.plugin-icon.fab, .plugin-icon.far {
				font-weight: 400;
			}


			.joplin-tinymce .tox-toolbar__group {
				background-color: ${theme.backgroundColor3};
				padding-top: ${theme.toolbarPadding}px;
				padding-bottom: ${theme.toolbarPadding}px;
			}

			.joplin-tinymce .tox .tox-edit-area__iframe {
				background-color: ${backgroundColor} !important;
			}

			.joplin-tinymce .tox .tox-toolbar__primary {
				/* This component sets an empty svg with a white background as the background
				 * which needs to be cleared to prevent it from flashing white in dark themes */
				background: none;
				background-color: ${theme.backgroundColor3} !important;
			}
		`));

		return () => {
			editorContainerDom.head.removeChild(element);
		};
		// editorReady is here because TinyMCE starts by initializing a blank iframe, which needs to be
		// styled by us, otherwise users in dark mode get a bright white flash. During initialization
		// our styling is overwritten which causes some elements to have the wrong styling. Removing the
		// style and re-applying it on editorReady gives our styles precedence and prevents any flashing
		//
		// watchedNoteFiles is here , as it triggers a re-render of styles whenever it changes,
		// this keeps the toolbar header styles in sync with toggle external editing button
		//
		// tl;dr: editorReady is used here because the css needs to be re-applied after TinyMCE init
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [editorReady, editorContainerDom, props.themeId, lightTheme, props.whiteBackgroundNoteRendering, props.watchedNoteFiles]);

	// -----------------------------------------------------------------------------------------
	// Enable or disable the editor
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		if (!editor) return;
		editor.mode.set(props.disabled ? 'readonly' : 'design');
	}, [editor, props.disabled]);

	// -----------------------------------------------------------------------------------------
	// Create and setup the editor
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		if (!scriptLoaded) return;
		if (!editorContainer) return;

		const loadEditor = async () => {
			const language = closestSupportedLocale(props.locale, true, supportedLocales);

			const pluginCommandNames: string[] = [];

			const infos = pluginUtils.viewInfosByType(props.plugins, 'toolbarButton');

			for (const info of infos) {
				const view = info.view;
				if (view.location !== 'editorToolbar') continue;
				pluginCommandNames.push(view.commandName);
			}

			const toolbarPluginButtons = pluginCommandNames.length ? ` | ${pluginCommandNames.join(' ')}` : '';

			// The toolbar is going to wrap based on groups of buttons
			// (delimited by |). It means that if we leave large groups of
			// buttons towards the end of the toolbar it's going to needlessly
			// hide many buttons even when there is space. So this is why below,
			// we create small groups of just one button towards the end.

			const toolbar = [
				'bold', 'italic', 'joplinHighlight', 'joplinStrikethrough', 'formattingExtras', '|',
				'link', 'joplinInlineCode', 'joplinCodeBlock', 'joplinAttach', '|',
				'bullist', 'numlist', 'joplinChecklist', '|',
				'h1', 'h2', 'h3', '|',
				'hr', '|',
				'blockquote', '|',
				'tableWithHeader', '|',
				`joplinInsertDateTime${toolbarPluginButtons}`,
			];

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const containerWindow = editorContainerDom.defaultView as any;
			const editors = await containerWindow.tinymce.init({
				selector: `#${editorContainer.id}`,

				// Ensures that the "Premium plugins" toolbar option is disabled. See
				// https://www.tiny.cloud/docs/tinymce/latest/editor-premium-upgrade-promotion/
				promotion: false,
				width: '100%',
				body_class: 'jop-tinymce',
				height: '100%',
				resize: false,
				highlight_on_focus: false,
				icons: 'Joplin',
				icons_url: 'gui/NoteEditor/NoteBody/TinyMCE/icons.js',
				plugins: 'link joplinLists searchreplace codesample table',
				noneditable_class: 'joplin-editable', // Can be a regex too
				iframe_aria_text: _('Rich Text editor. Press Escape then Tab to escape focus.'),

				// #p: Pad empty paragraphs with &nbsp; to prevent them from being removed.
				// *[*]: Allow all elements and attributes -- we already filter in sanitize_html
				// See https://www.tiny.cloud/docs/configure/content-filtering/#controlcharacters
				valid_elements: '#p,*[*]',

				menubar: false,
				relative_urls: false,
				branding: false,
				statusbar: false,
				link_target_list: false,
				// Handle the first table row as table header.
				// https://www.tiny.cloud/docs/plugins/table/#table_header_type
				table_header_type: 'sectionCells',
				language_url: ['en_US', 'en_GB'].includes(language) ? undefined : `${bridge().vendorDir()}/lib/tinymce/langs/${language}`,
				toolbar: toolbar.join(' '),
				localization_function: _,
				contextmenu: false,
				browser_spellcheck: true,

				formats: {
					joplinHighlight: { inline: 'mark', remove: 'all' },
					joplinStrikethrough: { inline: 's', remove: 'all' },
					joplinInsert: { inline: 'ins', remove: 'all' },
					joplinSub: { inline: 'sub', remove: 'all' },
					joplinSup: { inline: 'sup', remove: 'all' },
					code: { inline: 'code', remove: 'all', attributes: { spellcheck: 'false' } },
					forecolor: { inline: 'span', styles: { color: '%value' } },
				},
				setup: (editor: Editor) => {
					editor.addCommand('joplinAttach', () => {
						insertResourcesIntoContentRef.current();
					});

					editor.ui.registry.addButton('joplinAttach', {
						tooltip: _('Attach file'),
						icon: 'paperclip',
						onAction: async function() {
							editor.execCommand('joplinAttach');
						},
					});

					setupToolbarButtons(editor);

					editor.ui.registry.addButton('joplinCodeBlock', {
						tooltip: _('Code Block'),
						icon: 'code-sample',
						onAction: async function() {
							editDialogRef.current.editNew();
						},
					});

					editor.ui.registry.addToggleButton('joplinInlineCode', {
						tooltip: _('Inline Code'),
						icon: 'sourcecode',
						onAction: function() {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
							editor.execCommand('mceToggleFormat', false, 'code', { class: 'inline-code' } as any);
						},
						onSetup: function(api) {
							api.setActive(editor.formatter.match('code'));
							const handle = editor.formatter.formatChanged('code', active => api.setActive(active));

							return function() {
								handle?.unbind();
							};
						},
					});

					editor.ui.registry.addMenuButton('tableWithHeader', {
						icon: 'table',
						tooltip: 'Table',
						fetch: (callback) => {
							callback([
								{
									type: 'fancymenuitem',
									fancytype: 'inserttable',
									onAction: (data) => {
										editor.execCommand('mceInsertTable', false, { rows: data.numRows, columns: data.numColumns, options: { headerRows: 1 } });
									},
								},
							]);
						},
					});

					editor.ui.registry.addButton('joplinInsertDateTime', {
						tooltip: _('Insert time'),
						icon: 'insert-time',
						onAction: function() {
							void CommandService.instance().execute('insertDateTime');
						},
					});

					for (const pluginCommandName of pluginCommandNames) {
						const iconClassName = CommandService.instance().iconName(pluginCommandName);

						// Only allow characters that appear in Font Awesome class names: letters, spaces, and dashes.
						const safeIconClassName = iconClassName.replace(/[^a-z0-9 -]/g, '');

						editor.ui.registry.addIcon(pluginCommandName, `<i class="plugin-icon ${safeIconClassName}"></i>`);

						editor.ui.registry.addButton(pluginCommandName, {
							tooltip: CommandService.instance().label(pluginCommandName),
							icon: pluginCommandName,
							onAction: function() {
								void CommandService.instance().execute(pluginCommandName);
							},
						});
					}

					editor.addShortcut('Meta+Shift+7', '', () => editor.execCommand('InsertOrderedList'));
					editor.addShortcut('Meta+Shift+8', '', () => editor.execCommand('InsertUnorderedList'));
					editor.addShortcut('Meta+Shift+9', '', () => editor.execCommand('InsertJoplinChecklist'));

					// TODO: remove event on unmount?
					editor.on('drop', (event) => {
						// Prevent the message "Dropped file type is not supported" from showing up.
						// It was added in TinyMCE 5.4 and doesn't apply since we do support
						// the file type.
						//
						// See https://stackoverflow.com/questions/64782955/tinymce-inline-drag-and-drop-image-upload-not-working
						//
						// The other suggested solution, setting block_unsupported_drop to false,
						// causes all dropped files to be placed at the top of the document.
						//
						// Because .preventDefault cancels TinyMCE's own drop handler, we only
						// call .preventDefault if Joplin handled the event:
						if (props_onDrop.current(event)) {
							event.preventDefault();
						}
					});

					editor.on('ObjectResized', (event) => {
						if (event.target.nodeName === 'IMG') {
							editor.fire(TinyMceEditorEvents.JoplinChange);
							dispatchDidUpdate(editor);
						}
					});

					editor.on('init', () => {
						setEditorReady(true);
					});

					const preprocessContent = () => {
						// Disable spellcheck for all inline code blocks.
						const codeElements = editor.dom.doc.querySelectorAll('code.inline-code');
						for (const code of codeElements) {
							code.setAttribute('spellcheck', 'false');
						}
					};

					editor.on('SetContent', () => {
						preprocessContent();

						props_onMessage.current({ channel: 'noteRenderComplete' });
					});
				},
			});

			setEditor(editors[0]);
		};

		void loadEditor();
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [scriptLoaded, editorContainer]);

	// -----------------------------------------------------------------------------------------
	// Set the initial content and load the plugin CSS and JS files
	// -----------------------------------------------------------------------------------------

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const loadDocumentAssets = (themeId: number, editor: any, pluginAssets: any[]) => {
		const theme = themeStyle(themeId);

		let docHead_: HTMLHeadElement = null;

		function docHead() {
			if (docHead_) return docHead_;
			docHead_ = editor.getDoc().getElementsByTagName('head')[0];
			return docHead_;
		}

		const allCssFiles = [
			`${bridge().vendorDir()}/lib/@fortawesome/fontawesome-free/css/all.min.css`,
			`gui/note-viewer/pluginAssets/highlight.js/${theme.codeThemeCss}`,
		].concat(
			pluginAssets
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.filter((a: any) => a.mime === 'text/css')
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.map((a: any) => a.path),
		);

		const allJsFiles = [].concat(
			pluginAssets
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.filter((a: any) => a.mime === 'application/javascript')
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.map((a: any) => a.path),
		);

		const filePathToElementId = (path: string) => {
			return `jop-tiny-mce-${md5(escape(path))}`;
		};

		const existingElements = Array.from(docHead().getElementsByClassName('jop-tinymce-css')).concat(Array.from(docHead().getElementsByClassName('jop-tinymce-js')));

		const existingIds: string[] = [];
		for (const e of existingElements) existingIds.push(e.getAttribute('id'));

		const processedIds: string[] = [];

		for (const cssFile of allCssFiles) {
			const elementId = filePathToElementId(cssFile);
			processedIds.push(elementId);
			if (existingIds.includes(elementId)) continue;

			const style = editor.dom.create('link', {
				id: elementId,
				rel: 'stylesheet',
				type: 'text/css',
				href: cssFile,
				class: 'jop-tinymce-css',
			});

			docHead().appendChild(style);
		}

		for (const jsFile of allJsFiles) {
			const elementId = filePathToElementId(jsFile);
			processedIds.push(elementId);
			if (existingIds.includes(elementId)) continue;

			const script = editor.dom.create('script', {
				id: filePathToElementId(jsFile),
				type: 'text/javascript',
				class: 'jop-tinymce-js',
				src: jsFile,
			});

			docHead().appendChild(script);
		}

		// Remove all previously loaded files that aren't in the assets this time.
		// Note: This is important to ensure that we properly change themes.
		// See https://github.com/laurent22/joplin/issues/8520
		for (const existingId of existingIds) {
			if (!processedIds.includes(existingId)) {
				const element = existingElements.find(e => e.getAttribute('id') === existingId);
				if (element) docHead().removeChild(element);
			}
		}
	};

	function resourceInfosEqual(ri1: ResourceInfos, ri2: ResourceInfos): boolean {
		if (ri1 && !ri2 || !ri1 && ri2) return false;
		if (!ri1 && !ri2) return true;

		const keys1 = Object.keys(ri1);
		const keys2 = Object.keys(ri2);

		if (keys1.length !== keys2.length) return false;

		// The attachedResources() call that generates the ResourceInfos object
		// uses cache for the resource objects, so we can use strict equality
		// for comparison.
		for (const k of keys1) {
			if (ri1[k] !== ri2[k]) return false;
		}

		return true;
	}

	useEffect(() => {
		if (!editor) return () => {};

		if (resourcesStatus(props.resourceInfos) !== 'ready') {
			editor.setContent('');
			return () => {};
		}

		let cancelled = false;

		const loadContent = async () => {
			const resourcesEqual = resourceInfosEqual(lastOnChangeEventInfo.current.resourceInfos, props.resourceInfos);

			if (lastOnChangeEventInfo.current.content !== props.content || !resourcesEqual) {
				const result = await props.markupToHtml(
					props.contentMarkupLanguage,
					props.content,
					markupRenderOptions({
						resourceInfos: props.resourceInfos,

						// Allow file:// URLs that point to the resource directory.
						// This prevents HTML-style resource URLs (e.g. <a href="file://path/to/resource/.../"></a>)
						// from being discarded.
						allowedFilePrefixes: [props.resourceDirectory],
					}),
				);
				if (cancelled) return;

				// Use an offset bookmark -- the default bookmark type is not preserved after unloading
				// and reloading the editor.
				// See https://github.com/tinymce/tinymce/issues/9736 for a brief description of the
				// different bookmark types. An offset bookmark seems to have the smallest change
				// when the note content is updated externally.
				const offsetBookmarkId = 2;
				const bookmark = editor.selection.getBookmark(offsetBookmarkId);
				editor.setContent(awfulInitHack(result.html));

				if (lastOnChangeEventInfo.current.contentKey !== props.contentKey) {
					// Need to clear UndoManager to avoid this problem:
					// - Load note 1
					// - Make a change
					// - Load note 2
					// - Undo => content is that of note 1
					//
					// The doc is not very clear what's the different between
					// clear() and reset() but it seems reset() works best, in
					// particular for the onPaste bug.
					//
					// It seems the undo manager must be reset after having
					// set the initial content (not before). Otherwise undoing multiple
					// times would result in an empty note.
					// https://github.com/laurent22/joplin/issues/3534
					editor.undoManager.reset();
				} else {
					// Restore the cursor location
					editor.selection.bookmarkManager.moveToBookmark(bookmark);
				}

				lastOnChangeEventInfo.current = {
					content: props.content,
					resourceInfos: props.resourceInfos,
					contentKey: props.contentKey,
				};
			}

			const allAssetsOptions: NoteStyleOptions = {
				contentMaxWidthTarget: '.mce-content-body',
				scrollbarSize: props.scrollbarSize,
				themeId: props.contentMarkupLanguage === MarkupLanguage.Html ? 1 : null,
				whiteBackgroundNoteRendering: props.whiteBackgroundNoteRendering,
			};

			const allAssets = await props.allAssets(props.contentMarkupLanguage, allAssetsOptions);
			await loadDocumentAssets(props.themeId, editor, allAssets);

			dispatchDidUpdate(editor);
		};

		void loadContent();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [editor, props.themeId, props.scrollbarSize, props.markupToHtml, props.allAssets, props.content, props.resourceInfos, props.contentKey, props.contentMarkupLanguage, props.whiteBackgroundNoteRendering]);

	useEffect(() => {
		if (!editor) return () => {};

		editor.getDoc().addEventListener('click', onEditorContentClick);
		return () => {
			editor.getDoc().removeEventListener('click', onEditorContentClick);
		};
	}, [editor, onEditorContentClick]);

	// This is to handle dropping notes on the editor. In this case, we add an
	// overlay over the editor, which makes it a valid drop target. This in
	// turn makes NoteEditor get the drop event and dispatch it.
	useEffect(() => {
		if (!editor) return () => {};

		function onDragStart() {
			setDraggingStarted(true);
		}

		function onDrop() {
			setDraggingStarted(false);
		}

		function onDragEnd() {
			setDraggingStarted(false);
		}

		document.addEventListener('dragstart', onDragStart);
		document.addEventListener('drop', onDrop);
		document.addEventListener('dragend', onDragEnd);
		return () => {
			document.removeEventListener('dragstart', onDragStart);
			document.removeEventListener('drop', onDrop);
			document.removeEventListener('dragend', onDragEnd);
		};
	}, [editor]);

	// -----------------------------------------------------------------------------------------
	// Handle onChange event
	// -----------------------------------------------------------------------------------------

	// Need to save the onChange handler to a ref to make sure
	// we call the current one from setTimeout.
	// https://github.com/facebook/react/issues/14010#issuecomment-433788147
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const props_onChangeRef = useRef<Function>();
	props_onChangeRef.current = props.onChange;

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	const prop_htmlToMarkdownRef = useRef<HtmlToMarkdownHandler>();
	prop_htmlToMarkdownRef.current = props.htmlToMarkdown;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const nextOnChangeEventInfo = useRef<any>(null);

	async function execOnChangeEvent() {
		const info = nextOnChangeEventInfo.current;
		if (!info) return;

		nextOnChangeEventInfo.current = null;

		resetLinkTooltips();
		const contentMd = await prop_htmlToMarkdownRef.current(info.contentMarkupLanguage, info.editor.getContent(), info.contentOriginalCss);

		lastOnChangeEventInfo.current.content = contentMd;
		lastOnChangeEventInfo.current.resourceInfos = await attachedResources(contentMd);

		props_onChangeRef.current({
			changeId: info.changeId,
			content: contentMd,
		});

		dispatchDidUpdate(info.editor);
	}

	// When the component unmount, we dispatch the change event
	// that was scheduled so that the parent component can save
	// the note.
	useEffect(() => {
		return () => {
			void execOnChangeEvent();
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onChangeHandlerTimeoutRef = useRef<any>(null);

	useEffect(() => {
		if (!editor) return () => {};

		function onChangeHandler() {
			// First this component notifies the parent that a change is going to happen.
			// Then the actual onChange event is fired after a timeout or when this
			// component gets unmounted.

			const changeId = changeId_++;
			props.onWillChange({ changeId: changeId });

			if (onChangeHandlerTimeoutRef.current) shim.clearTimeout(onChangeHandlerTimeoutRef.current);

			nextOnChangeEventInfo.current = {
				changeId: changeId,
				editor: editor,
				contentMarkupLanguage: props.contentMarkupLanguage,
				contentOriginalCss: props.contentOriginalCss,
			};

			onChangeHandlerTimeoutRef.current = shim.setTimeout(async () => {
				onChangeHandlerTimeoutRef.current = null;
				void execOnChangeEvent();
			}, 1000);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function onExecCommand(event: any) {
			const c: string = event.command;
			if (!c) return;

			// We need to dispatch onChange for these commands:
			//
			// InsertHorizontalRule
			// InsertOrderedList
			// InsertUnorderedList
			// mceInsertContent
			// mceToggleFormat
			//
			// Any maybe others, so to catch them all we only check the prefix

			const changeCommands = [
				'mceBlockQuote',
				'ToggleJoplinChecklistItem',
				'Bold',
				'Italic',
				'Underline',
				'Paragraph',
				'mceApplyTextcolor',
			];

			if (
				changeCommands.includes(c) ||
				c.indexOf('Insert') === 0 ||
				c.indexOf('Header') === 0 ||
				c.indexOf('mceToggle') === 0 ||
				c.indexOf('mceInsert') === 0 ||
				c.indexOf('mceTable') === 0
			) {
				onChangeHandler();
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const onSetAttrib = (event: EditorEvent<any>) => {
			// Dispatch onChange when a link is edited
			const target = Array.isArray(event.attrElm) ? event.attrElm[0] : event.attrElm;
			if (target.nodeName === 'A') {
				if (event.attrName === 'title' || event.attrName === 'href' || event.attrName === 'rel') {
					onChangeHandler();
				}
			}
		};

		// Keypress means that a printable key (letter, digit, etc.) has been
		// pressed so we want to always trigger onChange in this case
		function onKeypress() {
			onChangeHandler();
		}

		// KeyUp is triggered for any keypress, including Control, Shift, etc.
		// so most of the time we don't want to trigger onChange. We trigger
		// it however for the keys that might change text, such as Delete or
		// Backspace. It's not completely accurate though because if user presses
		// Backspace at the beginning of a note or Delete at the end, we trigger
		// onChange even though nothing is changed. The alternative would be to
		// check the content before and after, but this is too slow, so let's
		// keep it this way for now.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function onKeyUp(event: any) {
			if (['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key)) {
				onChangeHandler();
			}
		}

		async function onPaste(event: ClipboardEvent) {
			// We do not use the default pasting behaviour because the input has
			// to be processed in various ways.
			event.preventDefault();

			const pastedText = event.clipboardData.getData('text/plain');

			// event.clipboardData.getData('text/html') wraps the
			// content with <html><body></body></html>, which seems to
			// be not supported in editor.insertContent().
			//
			// when pasting text with Ctrl+Shift+V, the format should be
			// ignored. In this case,
			// event.clipboardData.getData('text/html') returns an empty
			// string, but the clipboard.readHTML() still returns the
			// formatted text.
			const pastedHtml = event.clipboardData.getData('text/html') ? clipboard.readHTML() : '';

			const resourceMds = await getResourcesFromPasteEvent(event);

			if (shouldPasteResources(pastedText, pastedHtml, resourceMds)) {
				logger.info(`onPaste: pasting ${resourceMds.length} resources`);
				if (resourceMds.length) {
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resourceMds.join('\n'), markupRenderOptions({ bodyOnly: true }));
					editor.insertContent(result.html);
				}
			} else {
				if (BaseItem.isMarkdownTag(pastedText) || hasProtocol(pastedText, ['https', 'joplin', 'file'])) { // Paste a link to a note
					logger.info('onPaste: pasting as a Markdown tag');
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, pastedText, markupRenderOptions({ bodyOnly: true }));
					editor.insertContent(result.html);
				} else { // Paste regular text
					if (pastedHtml) { // Handles HTML
						logger.info('onPaste: pasting as HTML');

						const modifiedHtml = await processPastedHtml(
							pastedHtml,
							prop_htmlToMarkdownRef.current,
							markupToHtml.current,
						);
						editor.insertContent(modifiedHtml);
					} else { // Handles plain text
						logger.info('onPaste: pasting as text');
						pasteAsPlainText(pastedText);
					}
				}
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		async function onCopy(event: any) {
			const copiedContent = editor.selection.getContent();
			copyHtmlToClipboard(copiedContent);
			event.preventDefault();
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		async function onCut(event: any) {
			const selectedContent = editor.selection.getContent();
			copyHtmlToClipboard(selectedContent);
			editor.insertContent('');
			event.preventDefault();
			onChangeHandler();
		}

		function pasteAsPlainText(text: string = null) {
			const pastedText = text === null ? clipboard.readText() : text;
			if (pastedText) {
				editor.insertContent(plainTextToHtml(pastedText));
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		async function onKeyDown(event: any) {
			// It seems "paste as text" is handled automatically on Windows and Linux,
			// so we need to run the below code only on macOS. If we were to run this
			// on Windows/Linux, we would have this double-paste issue:
			// https://github.com/laurent22/joplin/issues/4243

			// While "paste as text" functionality is handled by Windows and Linux, if we
			// want to allow the user to customize the shortcut we need to prevent when it
			// has the default value so it doesn't paste the content twice
			// (one by the system and the other by our code)
			if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyV') {
				event.preventDefault();
				pasteAsPlainText(null);
			}
		}

		function onPasteAsText() {
			// clipboard.readText returns Markdown instead of text when copying content from
			// the Rich Text Editor. When the user "Paste as text" he does not expect to see
			// anything besides text, that is why we are stripping here before pasting
			// https://github.com/laurent22/joplin/pull/8351
			const clipboardWithoutMarkdown = stripMarkup(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, clipboard.readText());
			pasteAsPlainText(clipboardWithoutMarkdown);
		}

		editor.on(TinyMceEditorEvents.KeyUp, onKeyUp);
		editor.on(TinyMceEditorEvents.KeyDown, onKeyDown);
		editor.on(TinyMceEditorEvents.KeyPress, onKeypress);
		// Passing `true` adds the listener to the front of the listener list.
		// This allows overriding TinyMCE's built-in paste handler with .preventDefault.
		editor.on(TinyMceEditorEvents.Paste, onPaste, true);
		editor.on(TinyMceEditorEvents.PasteAsText, onPasteAsText);
		editor.on(TinyMceEditorEvents.Copy, onCopy);
		// `compositionend` means that a user has finished entering a Chinese
		// (or other languages that require IME) character.
		editor.on(TinyMceEditorEvents.CompositionEnd, onChangeHandler);
		editor.on(TinyMceEditorEvents.Cut, onCut);
		editor.on(TinyMceEditorEvents.JoplinChange, onChangeHandler);
		editor.on(TinyMceEditorEvents.Undo, onChangeHandler);
		editor.on(TinyMceEditorEvents.Redo, onChangeHandler);
		editor.on(TinyMceEditorEvents.ExecCommand, onExecCommand);
		editor.on(TinyMceEditorEvents.SetAttrib, onSetAttrib);

		return () => {
			try {
				editor.off(TinyMceEditorEvents.KeyUp, onKeyUp);
				editor.off(TinyMceEditorEvents.KeyDown, onKeyDown);
				editor.off(TinyMceEditorEvents.KeyPress, onKeypress);
				editor.off(TinyMceEditorEvents.Paste, onPaste);
				editor.off(TinyMceEditorEvents.PasteAsText, onPasteAsText);
				editor.off(TinyMceEditorEvents.Copy, onCopy);
				editor.off(TinyMceEditorEvents.CompositionEnd, onChangeHandler);
				editor.off(TinyMceEditorEvents.Cut, onCut);
				editor.off(TinyMceEditorEvents.JoplinChange, onChangeHandler);
				editor.off(TinyMceEditorEvents.Undo, onChangeHandler);
				editor.off(TinyMceEditorEvents.Redo, onChangeHandler);
				editor.off(TinyMceEditorEvents.ExecCommand, onExecCommand);
				editor.off(TinyMceEditorEvents.SetAttrib, onSetAttrib);
			} catch (error) {
				console.warn('Error removing events', error);
			}
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.onWillChange, props.onChange, props.contentMarkupLanguage, props.contentOriginalCss, editor]);

	// -----------------------------------------------------------------------------------------
	// Destroy the editor when unmounting
	// Note that this effect must always be last, otherwise other effects that access the
	// editor in their clean up function will get an invalid reference.
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		return () => {
			if (!editorRef.current) return;

			const ownerDocument = editorRef.current.getContainer().ownerDocument;
			const parentWindow = ownerDocument.defaultView;

			// Calling .remove after the parent window is closed throws an Error
			// related to DOM API access. Since closing the window also removes the editor,
			// it shouldn't be necessary to call .remove in this case:
			if (parentWindow) {
				editorRef.current.remove();
			}
		};
	}, []);

	function renderExtraToolbarButton(key: string, info: ToolbarItem) {
		if (info.type === 'separator') return null;

		return <ToolbarButton
			key={key}
			themeId={props.themeId}
			toolbarButtonInfo={info}
		/>;
	}

	const leftButtonCommandNames = ['historyBackward', 'historyForward', 'toggleExternalEditing'];

	function renderLeftExtraToolbarButtons() {
		const buttons = [];
		for (const info of props.noteToolbarButtonInfos) {
			if (!leftButtonCommandNames.includes(info.name)) continue;
			buttons.push(renderExtraToolbarButton(info.name, info));
		}

		return (
			<div style={styles.leftExtraToolbarContainer}>
				{buttons}
			</div>
		);
	}

	function renderRightExtraToolbarButtons() {
		const buttons = [];
		for (const info of props.noteToolbarButtonInfos) {
			if (leftButtonCommandNames.includes(info.name)) continue;

			if (info.type === 'button' && info.name === 'toggleEditors') {
				buttons.push(<ToggleEditorsButton
					key={info.name}
					value={ToggleEditorsButtonValue.RichText}
					themeId={props.themeId}
					toolbarButtonInfo={info}
				/>);
			} else {
				buttons.push(renderExtraToolbarButton(info.name, info));
			}
		}

		return (
			<div style={styles.rightExtraToolbarContainer}>
				{buttons}
			</div>
		);
	}

	// Currently we don't handle resource "auto" and "manual" mode with TinyMCE
	// as it is quite complex and probably rarely used.
	function renderDisabledOverlay() {
		const status = resourcesStatus(props.resourceInfos);
		if (status === 'ready' && !draggingStarted) return null;

		const theme = themeStyle(props.themeId);

		const message = draggingStarted ? _('Drop notes or files here') : _('Please wait for all attachments to be downloaded and decrypted. You may also switch to %s to edit the note.', _('Code View'));
		const statusComp = draggingStarted ? null : <p style={theme.textStyleMinor}>{`Status: ${status}`}</p>;
		return (
			<div style={styles.disabledOverlay}>
				<p style={theme.textStyle}>{message}</p>
				{statusComp}
			</div>
		);
	}

	const containerId = useMemo(() => {
		return `tinymce-container-${Math.ceil(Math.random() * 1000)}-${Date.now()}`;
	}, []);
	return (
		<div style={styles.rootStyle} className="joplin-tinymce">
			{renderDisabledOverlay()}
			{renderLeftExtraToolbarButtons()}
			{renderRightExtraToolbarButtons()}
			<div style={{ width: '100%', height: '100%' }} id={containerId} ref={setEditorContainer}/>
		</div>
	);
};

export default forwardRef(TinyMCE);

