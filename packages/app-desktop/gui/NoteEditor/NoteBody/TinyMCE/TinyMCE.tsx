import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ScrollOptions, ScrollOptionTypes, EditorCommand, NoteBodyEditorProps, ResourceInfos } from '../../utils/types';
import { resourcesStatus, commandAttachFileToBody, handlePasteEvent, processPastedHtml, attachedResources } from '../../utils/resourceHandling';
import useScroll from './utils/useScroll';
import styles_ from './styles';
import CommandService from '@joplin/lib/services/CommandService';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import ToggleEditorsButton, { Value as ToggleEditorsButtonValue } from '../../../ToggleEditorsButton/ToggleEditorsButton';
import ToolbarButton from '../../../../gui/ToolbarButton/ToolbarButton';
import usePluginServiceRegistration from '../../utils/usePluginServiceRegistration';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { _, closestSupportedLocale } from '@joplin/lib/locale';
import useContextMenu from './utils/useContextMenu';
import { copyHtmlToClipboard } from '../../utils/clipboardUtils';
import shim from '@joplin/lib/shim';
import { MarkupToHtml } from '@joplin/renderer';
import { reg } from '@joplin/lib/registry';
import BaseItem from '@joplin/lib/models/BaseItem';
import setupToolbarButtons from './utils/setupToolbarButtons';
import { plainTextToHtml } from '@joplin/lib/htmlUtils';
import openEditDialog from './utils/openEditDialog';
import { MarkupToHtmlOptions } from '../../utils/useMarkupToHtml';
import { themeStyle } from '@joplin/lib/theme';
import { loadScript } from '../../../utils/loadScript';
import bridge from '../../../../services/bridge';
import { TinyMceEditorEvents } from './utils/types';
import type { Editor } from 'tinymce';
import { joplinCommandToTinyMceCommands, TinyMceCommand } from './utils/joplinCommandToTinyMceCommands';
const { clipboard } = require('electron');
const supportedLocales = require('./supportedLocales');

function markupRenderOptions(override: MarkupToHtmlOptions = null): MarkupToHtmlOptions {
	return {
		plugins: {
			checkbox: {
				checkboxRenderingType: 2,
			},
			link_open: {
				linkRenderingType: 2,
			},
		},
		replaceResourceInternalToExternalLinks: true,
		...override,
	};
}

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
// Perhaps upgrading the list plugin (which is a fork of TinyMCE own list plugin)
// would help?
function awfulBrHack(html: string): string {
	return html === '<div id="rendered-md"></div>' ? '<div id="rendered-md"><br/></div>' : html;
}

function findEditableContainer(node: any): any {
	while (node) {
		if (node.classList && node.classList.contains('joplin-editable')) return node;
		node = node.parentNode;
	}
	return null;
}

let markupToHtml_ = new MarkupToHtml();
function stripMarkup(markupLanguage: number, markup: string, options: any = null) {
	if (!markupToHtml_) markupToHtml_ = new MarkupToHtml();
	return	markupToHtml_.stripMarkup(markupLanguage, markup, options);
}

interface LastOnChangeEventInfo {
	content: string;
	resourceInfos: ResourceInfos;
	contentKey: string;
}

let loadedCssFiles_: string[] = [];
let loadedJsFiles_: string[] = [];
let dispatchDidUpdateIID_: any = null;
let changeId_ = 1;

const TinyMCE = (props: NoteBodyEditorProps, ref: any) => {
	const [editor, setEditor] = useState(null);
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const [editorReady, setEditorReady] = useState(false);
	const [draggingStarted, setDraggingStarted] = useState(false);

	const props_onMessage = useRef(null);
	props_onMessage.current = props.onMessage;

	const props_onDrop = useRef(null);
	props_onDrop.current = props.onDrop;

	const markupToHtml = useRef(null);
	markupToHtml.current = props.markupToHtml;

	const lastOnChangeEventInfo = useRef<LastOnChangeEventInfo>({
		content: null,
		resourceInfos: null,
		contentKey: null,
	});

	const rootIdRef = useRef<string>(`tinymce-${Date.now()}${Math.round(Math.random() * 10000)}`);
	const editorRef = useRef<any>(null);
	editorRef.current = editor;

	const styles = styles_(props);
	// const theme = themeStyle(props.themeId);

	const { scrollToPercent } = useScroll({ editor, onScroll: props.onScroll });

	usePluginServiceRegistration(ref);
	useContextMenu(editor, props.plugins, props.dispatch);

	const dispatchDidUpdate = (editor: any) => {
		if (dispatchDidUpdateIID_) shim.clearTimeout(dispatchDidUpdateIID_);
		dispatchDidUpdateIID_ = shim.setTimeout(() => {
			dispatchDidUpdateIID_ = null;
			if (editor && editor.getDoc()) editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
		}, 10);
	};

	const insertResourcesIntoContent = useCallback(async (filePaths: string[] = null, options: any = null) => {
		const resourceMd = await commandAttachFileToBody('', filePaths, options);
		if (!resourceMd) return;
		const result = await props.markupToHtml(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resourceMd, markupRenderOptions({ bodyOnly: true }));
		editor.insertContent(result.html);
	}, [props.markupToHtml, editor]);

	const insertResourcesIntoContentRef = useRef(null);
	insertResourcesIntoContentRef.current = insertResourcesIntoContent;

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
					reg.logger().warn('TinyMce: could not find anchor with ID ', anchorName);
				}
			} else {
				props.onMessage({ channel: href });
			}
		}
	}, [editor, props.onMessage]);

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

				reg.logger().debug('TinyMce: execCommand', cmd);

				let commandProcessed = true;

				if (cmd.name === 'insertText') {
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, cmd.value, { bodyOnly: true });
					editor.insertContent(result.html);
				} else if (cmd.name === 'editor.focus') {
					editor.focus();
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
						reg.logger().warn('TinyMCE: unsupported drop item: ', cmd);
					}
				} else {
					commandProcessed = false;
				}

				if (commandProcessed) return true;

				const additionalCommands: any = {
					selectedText: () => {
						return stripMarkup(MarkupToHtml.MARKUP_LANGUAGE_HTML, editor.selection.getContent());
					},
					selectedHtml: () => {
						return editor.selection.getContent();
					},
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
					reg.logger().warn('TinyMCE: unsupported Joplin command: ', cmd);
					return false;
				}

				if (joplinCommandToTinyMceCommands[cmd.name] === true) {
					// Already handled in useWindowCommandHandlers.ts
				} else if (joplinCommandToTinyMceCommands[cmd.name] === false) {
					// Explicitely not supported
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
		let cancelled = false;

		async function loadScripts() {
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
				if (document.getElementById(s.id)) {
					s.loaded = true;
					continue;
				}

				// eslint-disable-next-line no-console
				console.info('Loading script', s.src);

				await loadScript(s);
				if (cancelled) return;

				s.loaded = true;
			}

			setScriptLoaded(true);
		}

		void loadScripts();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const theme = themeStyle(props.themeId);

		const element = document.createElement('style');
		element.setAttribute('id', 'tinyMceStyle');
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(`
			.joplin-tinymce .tox-editor-header {
				padding-left: ${styles.leftExtraToolbarContainer.width + styles.leftExtraToolbarContainer.padding * 2}px;
				padding-right: ${styles.rightExtraToolbarContainer.width + styles.rightExtraToolbarContainer.padding * 2}px;
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
			.tox .tox-dialog__footer {
				background-color: ${theme.backgroundColor} !important;
			}

			.tox .tox-dialog__body-content {
				color: ${theme.color};
			}

			/*
			When creating dialogs, TinyMCE doesn't seem to offer a way to style the components or to assign classes to them.
			We want the code dialog box text area to be monospace, and since we can't target this precisely, we apply the style
			to all textareas of all dialogs. As I think only the code dialog displays a textarea that should be fine.
			*/
			
			.tox .tox-dialog textarea {
				font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
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
			.tox .tox-dialog__header,
			.tox .tox-button--icon .tox-icon svg,
			.tox .tox-button.tox-button--icon .tox-icon svg,
			.tox textarea,
			.tox input,
			.tox .tox-label,
			.tox .tox-toolbar-label {
				color: ${theme.color3} !important;
				fill: ${theme.color3} !important;
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
			.tox .tox-tbtn--enabled:hover {
				background-color: ${theme.selectedColor};
			}

			.tox .tox-button--naked:hover:not(:disabled) {
				background-color: ${theme.backgroundColor} !important;
			}
			
			.tox .tox-tbtn:focus {
				background-color: ${theme.backgroundColor3}
			}
			
			.tox .tox-tbtn:hover {
				color: ${theme.colorHover3} !important;
				fill: ${theme.colorHover3} !important;
				background-color: ${theme.backgroundColorHover3}
			}			
			

			.tox .tox-tbtn {
				width: ${theme.toolbarHeight}px;
				height: ${theme.toolbarHeight}px;
				min-width: ${theme.toolbarHeight}px;
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

			.tox-tinymce,
			.tox .tox-toolbar__group,
			.tox.tox-tinymce-aux .tox-toolbar__overflow,
			.tox .tox-dialog__footer {
				border: none !important;
			}

			.tox-tinymce {
				border-top: none !important;
			}

			.joplin-tinymce .tox-toolbar__group {
				background-color: ${theme.backgroundColor3};
				padding-top: ${theme.toolbarPadding}px;
				padding-bottom: ${theme.toolbarPadding}px;
			}

			.joplin-tinymce .tox .tox-edit-area__iframe {
				background-color: ${theme.backgroundColor} !important;
			}

			.joplin-tinymce .tox .tox-toolbar__primary {
				/* This component sets an empty svg with a white background as the background
				 * which needs to be cleared to prevent it from flashing white in dark themes */
				background: none;
				background-color: ${theme.backgroundColor3} !important;
			}
		`));

		return () => {
			document.head.removeChild(element);
		};
		// editorReady is here because TinyMCE starts by initializing a blank iframe, which needs to be
		// styled by us, otherwise users in dark mode get a bright white flash. During initialization
		// our styling is overwritten which causes some elements to have the wrong styling. Removing the
		// style and re-applying it on editorReady gives our styles precedence and prevents any flashing
		//
		// tl;dr: editorReady is used here because the css needs to be re-applied after TinyMCE init
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [editorReady, props.themeId]);

	// -----------------------------------------------------------------------------------------
	// Enable or disable the editor
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		if (!editor) return;
		editor.setMode(props.disabled ? 'readonly' : 'design');
	}, [editor, props.disabled]);

	// -----------------------------------------------------------------------------------------
	// Create and setup the editor
	// -----------------------------------------------------------------------------------------

	useEffect(() => {
		if (!scriptLoaded) return;

		loadedCssFiles_ = [];
		loadedJsFiles_ = [];

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

			const toolbar = [
				'bold', 'italic', 'joplinHighlight', 'joplinStrikethrough', 'formattingExtras', '|',
				'link', 'joplinInlineCode', 'joplinCodeBlock', 'joplinAttach', '|',
				'bullist', 'numlist', 'joplinChecklist', '|',
				'h1', 'h2', 'h3', 'hr', 'blockquote', 'table', `joplinInsertDateTime${toolbarPluginButtons}`,
			];

			// Available table toolbar buttons:
			// https://www.tiny.cloud/docs/advanced/available-toolbar-buttons/#tableplugin
			const tableToolbar = [
				'tabledelete',
				'tableinsertrowbefore tableinsertrowafter tabledeleterow',
				'tableinsertcolbefore tableinsertcolafter tabledeletecol',
			];

			const editors = await (window as any).tinymce.init({
				selector: `#${rootIdRef.current}`,
				width: '100%',
				body_class: 'jop-tinymce',
				height: '100%',
				resize: false,
				icons: 'Joplin',
				icons_url: 'gui/NoteEditor/NoteBody/TinyMCE/icons.js',
				plugins: 'noneditable link joplinLists hr searchreplace codesample table',
				noneditable_noneditable_class: 'joplin-editable', // Can be a regex too
				valid_elements: '*[*]', // We already filter in sanitize_html
				menubar: false,
				relative_urls: false,
				branding: false,
				statusbar: false,
				target_list: false,
				// Handle the first table row as table header.
				// https://www.tiny.cloud/docs/plugins/table/#table_header_type
				table_header_type: 'sectionCells',
				table_toolbar: tableToolbar.join(' | '),
				table_resize_bars: false,
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
							openEditDialog(editor, markupToHtml, dispatchDidUpdate, null);
						},
					});

					editor.ui.registry.addToggleButton('joplinInlineCode', {
						tooltip: _('Inline Code'),
						icon: 'sourcecode',
						onAction: function() {
							editor.execCommand('mceToggleFormat', false, 'code', { class: 'inline-code' });
						},
						onSetup: function(api) {
							api.setActive(editor.formatter.match('code'));
							const unbind = editor.formatter.formatChanged('code', api.setActive).unbind;

							return function() {
								if (unbind) unbind();
							};
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
						editor.ui.registry.addButton(pluginCommandName, {
							tooltip: CommandService.instance().label(pluginCommandName),
							icon: CommandService.instance().iconName(pluginCommandName, 'tinymce'),
							onAction: function() {
								void CommandService.instance().execute(pluginCommandName);
							},
						});
					}

					editor.addShortcut('Meta+Shift+7', '', () => editor.execCommand('InsertOrderedList'));
					editor.addShortcut('Meta+Shift+8', '', () => editor.execCommand('InsertUnorderedList'));
					editor.addShortcut('Meta+Shift+9', '', () => editor.execCommand('InsertJoplinChecklist'));

					// TODO: remove event on unmount?
					editor.on('DblClick', (event) => {
						const editable = findEditableContainer(event.target);
						if (editable) openEditDialog(editor, markupToHtml, dispatchDidUpdate, editable);
					});

					// This is triggered when an external file is dropped on the editor
					editor.on('drop', (event) => {
						// Prevent the message "Dropped file type is not
						// supported" to show up. It was added in a recent
						// TinyMCE version and doesn't apply since we do support
						// the file type.
						// https://stackoverflow.com/questions/64782955/tinymce-inline-drag-and-drop-image-upload-not-working
						event.preventDefault();

						props_onDrop.current(event);
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

					editor.on('SetContent', () => {
						props_onMessage.current({ channel: 'noteRenderComplete' });
					});
				},
			});

			setEditor(editors[0]);
		};

		void loadEditor();
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [scriptLoaded]);

	// -----------------------------------------------------------------------------------------
	// Set the initial content and load the plugin CSS and JS files
	// -----------------------------------------------------------------------------------------

	const loadDocumentAssets = (editor: any, pluginAssets: any[]) => {
		// Note: The way files are cached is not correct because it assumes there's only one version
		// of each file. However, when the theme change, a new CSS file, specific to the theme, is
		// created. That file should not be loaded on top of the previous one, but as a replacement.
		// Otherwise it would do this:
		// - Try to load CSS for theme 1 => OK
		// - Try to load CSS for theme 2 => OK
		// - Try to load CSS for theme 1 => Skip because the file is in cache. As a result, theme 2
		//                                  incorrectly stay.
		// The fix would be to make allAssets() return a name and a version for each asset. Then the loading
		// code would check this and either append the CSS or replace.

		const theme = themeStyle(props.themeId);

		let docHead_: any = null;

		function docHead() {
			if (docHead_) return docHead_;
			docHead_ = editor.getDoc().getElementsByTagName('head')[0];
			return docHead_;
		}

		const cssFiles = [
			`${bridge().vendorDir()}/lib/@fortawesome/fontawesome-free/css/all.min.css`,
			`gui/note-viewer/pluginAssets/highlight.js/${theme.codeThemeCss}`,
		].concat(
			pluginAssets
				.filter((a: any) => a.mime === 'text/css')
				.map((a: any) => a.path)
		).filter((path: string) => !loadedCssFiles_.includes(path));

		const jsFiles = [].concat(
			pluginAssets
				.filter((a: any) => a.mime === 'application/javascript')
				.map((a: any) => a.path)
		).filter((path: string) => !loadedJsFiles_.includes(path));

		for (const cssFile of cssFiles) loadedCssFiles_.push(cssFile);
		for (const jsFile of jsFiles) loadedJsFiles_.push(jsFile);

		// console.info('loadDocumentAssets: files to load', cssFiles, jsFiles);

		if (cssFiles.length) {
			for (const cssFile of cssFiles) {
				const script = editor.dom.create('link', {
					rel: 'stylesheet',
					type: 'text/css',
					href: cssFile,
					class: 'jop-tinymce-css',
				});

				docHead().appendChild(script);
			}
		}

		if (jsFiles.length) {
			const editorElementId = editor.dom.uniqueId();

			for (const jsFile of jsFiles) {
				const script = editor.dom.create('script', {
					id: editorElementId,
					type: 'text/javascript',
					src: jsFile,
				});

				docHead().appendChild(script);
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
				const result = await props.markupToHtml(props.contentMarkupLanguage, props.content, markupRenderOptions({ resourceInfos: props.resourceInfos }));
				if (cancelled) return;

				editor.setContent(awfulBrHack(result.html));

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
				}

				lastOnChangeEventInfo.current = {
					content: props.content,
					resourceInfos: props.resourceInfos,
					contentKey: props.contentKey,
				};
			}

			await loadDocumentAssets(editor, await props.allAssets(props.contentMarkupLanguage, { contentMaxWidthTarget: '.mce-content-body' }));

			dispatchDidUpdate(editor);
		};

		void loadContent();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [editor, props.markupToHtml, props.allAssets, props.content, props.resourceInfos, props.contentKey]);

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
	const prop_htmlToMarkdownRef = useRef<Function>();
	prop_htmlToMarkdownRef.current = props.htmlToMarkdown;

	const nextOnChangeEventInfo = useRef<any>(null);

	async function execOnChangeEvent() {
		const info = nextOnChangeEventInfo.current;
		if (!info) return;

		nextOnChangeEventInfo.current = null;

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

			const changeCommands = ['mceBlockQuote', 'ToggleJoplinChecklistItem', 'Bold', 'Italic', 'Underline', 'Paragraph'];

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

		const onSetAttrib = (event: any) => {
			// Dispatch onChange when a link is edited
			if (event.attrElm[0].nodeName === 'A') {
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
		function onKeyUp(event: any) {
			if (['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key)) {
				onChangeHandler();
			}
		}

		async function onPaste(event: ClipboardEvent) {
			// We do not use the default pasting behaviour because the input has
			// to be processed in various ways.
			event.preventDefault();

			const resourceMds = await handlePasteEvent(event);
			if (resourceMds.length) {
				const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resourceMds.join('\n'), markupRenderOptions({ bodyOnly: true }));
				editor.insertContent(result.html);
			} else {
				const pastedText = event.clipboardData.getData('text/plain');

				if (BaseItem.isMarkdownTag(pastedText)) { // Paste a link to a note
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, pastedText, markupRenderOptions({ bodyOnly: true }));
					editor.insertContent(result.html);
				} else { // Paste regular text
					// event.clipboardData.getData('text/html') wraps the content with <html><body></body></html>,
					// which seems to be not supported in editor.insertContent().
					//
					// when pasting text with Ctrl+Shift+V, the format should be ignored.
					// In this case, event.clopboardData.getData('text/html') returns an empty string, but the clipboard.readHTML() still returns the formatted text.
					const pastedHtml = event.clipboardData.getData('text/html') ? clipboard.readHTML() : '';
					if (pastedHtml) { // Handles HTML
						const modifiedHtml = await processPastedHtml(pastedHtml);
						editor.insertContent(modifiedHtml);
					} else { // Handles plain text
						pasteAsPlainText(pastedText);
					}

					// This code before was necessary to get undo working after
					// pasting but it seems it's no longer necessary, so
					// removing it for now. We also couldn't do it immediately
					// it seems, or else nothing is added to the stack, so do it
					// on the next frame.
					//
					// window.requestAnimationFrame(() =>
					// editor.undoManager.add()); onChangeHandler();
				}
			}
		}

		async function onCopy(event: any) {
			const copiedContent = editor.selection.getContent();
			copyHtmlToClipboard(copiedContent);
			event.preventDefault();
		}

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
		editor.on(TinyMceEditorEvents.Paste, onPaste);
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
			if (editorRef.current) editorRef.current.remove();
		};
	}, []);

	function renderExtraToolbarButton(key: string, info: ToolbarButtonInfo) {
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

			if (info.name === 'toggleEditors') {
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

	return (
		<div style={styles.rootStyle} className="joplin-tinymce">
			{renderDisabledOverlay()}
			{renderLeftExtraToolbarButtons()}
			{renderRightExtraToolbarButtons()}
			<div style={{ width: '100%', height: '100%' }} id={rootIdRef.current}/>
		</div>
	);
};

export default forwardRef(TinyMCE);

