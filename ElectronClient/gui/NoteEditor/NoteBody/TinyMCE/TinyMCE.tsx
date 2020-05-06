import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ScrollOptions, ScrollOptionTypes, EditorCommand, NoteBodyEditorProps } from '../../utils/types';
import { resourcesStatus } from '../../utils/resourceHandling';
import useScroll from './utils/useScroll';
const { MarkupToHtml } = require('lib/joplin-renderer');
const taboverride = require('taboverride');
const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale');
const BaseItem = require('lib/models/BaseItem');
const { themeStyle, buildStyle } = require('../../../../theme.js');
const { clipboard } = require('electron');

function markupRenderOptions(override:any = null) {
	return {
		plugins: {
			checkbox: {
				renderingType: 2,
			},
			link_open: {
				linkRenderingType: 2,
			},
		},
		replaceResourceInternalToExternalLinks: true,
		...override,
	};
}

function findBlockSource(node:any) {
	const sources = node.getElementsByClassName('joplin-source');
	if (!sources.length) throw new Error('No source for node');
	const source = sources[0];

	return {
		openCharacters: source.getAttribute('data-joplin-source-open'),
		closeCharacters: source.getAttribute('data-joplin-source-close'),
		content: source.textContent,
		node: source,
		language: source.getAttribute('data-joplin-language') || '',
	};
}

function newBlockSource(language:string = '', content:string = ''):any {
	const fence = language === 'katex' ? '$$' : '```';
	const fenceLanguage = language === 'katex' ? '' : language;

	return {
		openCharacters: `\n${fence}${fenceLanguage}\n`,
		closeCharacters: `\n${fence}\n`,
		content: content,
		node: null,
		language: language,
	};
}

function findEditableContainer(node:any):any {
	while (node) {
		if (node.classList && node.classList.contains('joplin-editable')) return node;
		node = node.parentNode;
	}
	return null;
}

function editableInnerHtml(html:string):string {
	const temp = document.createElement('div');
	temp.innerHTML = html;
	const editable = temp.getElementsByClassName('joplin-editable');
	if (!editable.length) throw new Error(`Invalid joplin-editable: ${html}`);
	return editable[0].innerHTML;
}

function dialogTextArea_keyDown(event:any) {
	if (event.key === 'Tab') {
		window.requestAnimationFrame(() => event.target.focus());
	}
}

// Allows pressing tab in a textarea to input an actual tab (instead of changing focus)
// taboverride will take care of actually inserting the tab character, while the keydown
// event listener will override the default behaviour, which is to focus the next field.
function enableTextAreaTab(enable:boolean) {
	const textAreas = document.getElementsByClassName('tox-textarea');
	for (const textArea of textAreas) {
		taboverride.set(textArea, enable);

		if (enable) {
			textArea.addEventListener('keydown', dialogTextArea_keyDown);
		} else {
			textArea.removeEventListener('keydown', dialogTextArea_keyDown);
		}
	}
}

interface TinyMceCommand {
	name: string,
	value?: any,
	ui?: boolean
}

interface JoplinCommandToTinyMceCommands {
	[key:string]: TinyMceCommand,
}

const joplinCommandToTinyMceCommands:JoplinCommandToTinyMceCommands = {
	'textBold': { name: 'mceToggleFormat', value: 'bold' },
	'textItalic': { name: 'mceToggleFormat', value: 'italic' },
	'textLink': { name: 'mceLink' },
	'search': { name: 'SearchReplace' },
};

function styles_(props:NoteBodyEditorProps) {
	return buildStyle('TinyMCE', props.theme, (/* theme:any */) => {
		return {
			disabledOverlay: {
				zIndex: 10,
				position: 'absolute',
				backgroundColor: 'white',
				opacity: 0.7,
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				padding: 20,
				paddingTop: 50,
				textAlign: 'center',
			},
			rootStyle: {
				position: 'relative',
				...props.style,
			},
		};
	});
}

let loadedAssetFiles_:string[] = [];
let dispatchDidUpdateIID_:any = null;
let changeId_:number = 1;

const TinyMCE = (props:NoteBodyEditorProps, ref:any) => {
	const [editor, setEditor] = useState(null);
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const [editorReady, setEditorReady] = useState(false);

	const attachResources = useRef(null);
	attachResources.current = props.attachResources;

	const props_onMessage = useRef(null);
	props_onMessage.current = props.onMessage;

	const markupToHtml = useRef(null);
	markupToHtml.current = props.markupToHtml;

	const lastOnChangeEventContent = useRef<string>('');

	const rootIdRef = useRef<string>(`tinymce-${Date.now()}${Math.round(Math.random() * 10000)}`);
	const editorRef = useRef<any>(null);
	editorRef.current = editor;

	const styles = styles_(props);
	const theme = themeStyle(props.theme);

	const { scrollToPercent } = useScroll({ editor, onScroll: props.onScroll });

	const dispatchDidUpdate = (editor:any) => {
		if (dispatchDidUpdateIID_) clearTimeout(dispatchDidUpdateIID_);
		dispatchDidUpdateIID_ = setTimeout(() => {
			dispatchDidUpdateIID_ = null;
			if (editor && editor.getDoc()) editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
		}, 10);
	};

	const onEditorContentClick = useCallback((event:any) => {
		const nodeName = event.target ? event.target.nodeName : '';

		if (nodeName === 'INPUT' && event.target.getAttribute('type') === 'checkbox') {
			editor.fire('joplinChange');
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
				if (editor) editor.getWin().scrollTo(0,0);
			},
			scrollTo: (options:ScrollOptions) => {
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
			supportsCommand: (name:string) => {
				// TODO: should also handle commands that are not in this map (insertText, focus, etc);
				return !!joplinCommandToTinyMceCommands[name];
			},
			execCommand: async (cmd:EditorCommand) => {
				if (!editor) return false;

				reg.logger().debug('TinyMce: execCommand', cmd);

				let commandProcessed = true;

				if (cmd.name === 'insertText') {
					const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, cmd.value, { bodyOnly: true });
					editor.insertContent(result.html);
				} else if (cmd.name === 'focus') {
					editor.focus();
				} else {
					commandProcessed = false;
				}

				if (commandProcessed) return true;

				if (!joplinCommandToTinyMceCommands[cmd.name]) {
					reg.logger().warn('TinyMCE: unsupported Joplin command: ', cmd);
					return false;
				}

				const tinyMceCmd:TinyMceCommand = { ...joplinCommandToTinyMceCommands[cmd.name] };
				if (!('ui' in tinyMceCmd)) tinyMceCmd.ui = false;
				if (!('value' in tinyMceCmd)) tinyMceCmd.value = null;

				editor.execCommand(tinyMceCmd.name, tinyMceCmd.ui, tinyMceCmd.value);

				return true;
			},
		};
	}, [editor, props.contentMarkupLanguage, props.contentOriginalCss]);

	// -----------------------------------------------------------------------------------------
	// Load the TinyMCE library. The lib loads additional JS and CSS files on startup
	// (for themes), and so it needs to be loaded via <script> tag. Requiring it from the
	// module would not load these extra files.
	// -----------------------------------------------------------------------------------------

	const loadScript = async (script:any) => {
		return new Promise((resolve) => {
			let element:any = document.createElement('script');
			if (script.src.indexOf('.css') >= 0) {
				element = document.createElement('link');
				element.rel = 'stylesheet';
				element.href = script.src;
			} else {
				element.src = script.src;

				if (script.attrs) {
					for (const attr in script.attrs) {
						element[attr] = script.attrs[attr];
					}
				}
			}

			element.id = script.id;

			element.onload = () => {
				resolve();
			};

			document.getElementsByTagName('head')[0].appendChild(element);
		});
	};

	useEffect(() => {
		let cancelled = false;

		async function loadScripts() {
			const scriptsToLoad:any[] = [
				{
					src: 'node_modules/tinymce/tinymce.min.js',
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

				console.info('Loading script', s.src);

				await loadScript(s);
				if (cancelled) return;

				s.loaded = true;
			}

			setScriptLoaded(true);
		}

		loadScripts();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!editorReady) return () => {};

		const element = document.createElement('style');
		element.setAttribute('id', 'tinyMceStyle');
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(`
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

			.tox .tox-editor-header {
				border-bottom: 1px solid ${theme.dividerColor};
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
				color: ${theme.color} !important;
				fill: ${theme.color} !important;
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

			.tox .tox-tbtn:hover {
				background-color: ${theme.backgroundHover};
				color: ${theme.colorHover};
				fill: ${theme.colorHover};
			}

			.tox .tox-toolbar__primary,
			.tox .tox-toolbar__overflow {
				background: none;
			}

			.tox-tinymce,
			.tox .tox-toolbar__group,
			.tox.tox-tinymce-aux .tox-toolbar__overflow,
			.tox .tox-dialog__footer {
				border-color: ${theme.dividerColor} !important;
			}

			.tox-tinymce {
				border-top: none !important;
			}
		`));

		return () => {
			document.head.removeChild(element);
		};
	}, [editorReady]);

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

		loadedAssetFiles_ = [];

		const loadEditor = async () => {
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
				target_list: false,
				table_resize_bars: false,
				language: props.locale,
				toolbar: 'bold italic | link joplinInlineCode joplinCodeBlock joplinAttach | numlist bullist joplinChecklist | h1 h2 h3 hr blockquote table joplinInsertDateTime',
				localization_function: _,
				setup: (editor:any) => {

					function openEditDialog(editable:any) {
						const source = editable ? findBlockSource(editable) : newBlockSource();

						editor.windowManager.open({
							title: _('Edit'),
							size: 'large',
							initialData: {
								codeTextArea: source.content,
								languageInput: source.language,
							},
							onSubmit: async (dialogApi:any) => {
								const newSource = newBlockSource(dialogApi.getData().languageInput, dialogApi.getData().codeTextArea);
								const md = `${newSource.openCharacters}${newSource.content.trim()}${newSource.closeCharacters}`;
								const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, { bodyOnly: true });

								// markupToHtml will return the complete editable HTML, but we only
								// want to update the inner HTML, so as not to break additional props that
								// are added by TinyMCE on the main node.

								if (editable) {
									editable.innerHTML = editableInnerHtml(result.html);
								} else {
									editor.insertContent(result.html);
								}

								dialogApi.close();
								editor.fire('joplinChange');
								dispatchDidUpdate(editor);
							},
							onClose: () => {
								enableTextAreaTab(false);
							},
							body: {
								type: 'panel',
								items: [
									{
										type: 'input',
										name: 'languageInput',
										label: 'Language',
										// Katex is a special case with special opening/closing tags
										// and we don't currently handle switching the language in this case.
										disabled: source.language === 'katex',
									},
									{
										type: 'textarea',
										name: 'codeTextArea',
										value: source.content,
									},
								],
							},
							buttons: [
								{
									type: 'submit',
									text: 'OK',
								},
							],
						});

						window.requestAnimationFrame(() => {
							enableTextAreaTab(true);
						});
					}

					editor.ui.registry.addButton('joplinAttach', {
						tooltip: _('Attach file'),
						icon: 'paperclip',
						onAction: async function() {
							const resources = await attachResources.current();
							if (!resources.length) return;

							const html = [];
							for (const resource of resources) {
								const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resource.markdownTag, markupRenderOptions({ bodyOnly: true }));
								html.push(result.html);
							}

							editor.insertContent(html.join('\n'));
							editor.fire('joplinChange');
							dispatchDidUpdate(editor);
						},
					});

					editor.ui.registry.addButton('joplinCodeBlock', {
						tooltip: _('Code Block'),
						icon: 'code-sample',
						onAction: async function() {
							openEditDialog(null);
						},
					});

					editor.ui.registry.addToggleButton('joplinInlineCode', {
						tooltip: _('Inline Code'),
						icon: 'sourcecode',
						onAction: function() {
							editor.execCommand('mceToggleFormat', false, 'code', { class: 'inline-code' });
						},
						onSetup: function(api:any) {
							api.setActive(editor.formatter.match('code'));
							const unbind = editor.formatter.formatChanged('code', api.setActive).unbind;

							return function() {
								if (unbind) unbind();
							};
						},
					});

					editor.ui.registry.addButton('joplinInsertDateTime', {
						tooltip: _('Insert Date Time'),
						icon: 'insert-time',
						onAction: function() {
							props.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'insertDateTime',
							});
						},
					});

					// TODO: remove event on unmount?
					editor.on('DblClick', (event:any) => {
						const editable = findEditableContainer(event.target);
						if (editable) openEditDialog(editable);
					});

					editor.on('ObjectResized', function(event:any) {
						if (event.target.nodeName === 'IMG') {
							editor.fire('joplinChange');
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

		loadEditor();
	}, [scriptLoaded]);

	// -----------------------------------------------------------------------------------------
	// Set the initial content and load the plugin CSS and JS files
	// -----------------------------------------------------------------------------------------

	const loadDocumentAssets = (editor:any, pluginAssets:any[]) => {
		const cssFiles = [
			'css/fork-awesome.min.css',
			`gui/note-viewer/pluginAssets/highlight.js/${theme.codeThemeCss}`,
		].concat(
			pluginAssets
				.filter((a:any) => a.mime === 'text/css')
				.map((a:any) => a.path)
		).filter((path:string) => !loadedAssetFiles_.includes(path));

		const jsFiles = [].concat(
			pluginAssets
				.filter((a:any) => a.mime === 'application/javascript')
				.map((a:any) => a.path)
		).filter((path:string) => !loadedAssetFiles_.includes(path));

		for (const cssFile of cssFiles) loadedAssetFiles_.push(cssFile);
		for (const jsFile of jsFiles) loadedAssetFiles_.push(jsFile);

		console.info('loadDocumentAssets: files to load', cssFiles, jsFiles);

		if (cssFiles.length) editor.dom.loadCSS(cssFiles.join(','));

		if (jsFiles.length) {
			const editorElementId = editor.dom.uniqueId();

			for (const jsFile of jsFiles) {
				const script = editor.dom.create('script', {
					id: editorElementId,
					type: 'text/javascript',
					src: jsFile,
				});

				editor.getDoc().getElementsByTagName('head')[0].appendChild(script);
			}
		}
	};

	useEffect(() => {
		if (!editor) return () => {};

		if (resourcesStatus(props.resourceInfos) !== 'ready') {
			editor.setContent('');
			return () => {};
		}

		let cancelled = false;

		const loadContent = async () => {
			if (lastOnChangeEventContent.current === props.content) return;

			const result = await props.markupToHtml(props.contentMarkupLanguage, props.content, markupRenderOptions({ resourceInfos: props.resourceInfos }));
			if (cancelled) return;

			lastOnChangeEventContent.current = props.content;
			editor.setContent(result.html);

			await loadDocumentAssets(editor, await props.allAssets(props.contentMarkupLanguage));

			// Need to clear UndoManager to avoid this problem:
			// - Load note 1
			// - Make a change
			// - Load note 2
			// - Undo => content is that of note 1

			// The doc is not very clear what's the different between
			// clear() and reset() but it seems reset() works best, in
			// particular for the onPaste bug.
			editor.undoManager.reset();

			dispatchDidUpdate(editor);
		};

		loadContent();

		return () => {
			cancelled = true;
		};
	}, [editor, props.markupToHtml, props.allAssets, props.content, props.resourceInfos]);

	useEffect(() => {
		if (!editor) return () => {};

		editor.getDoc().addEventListener('click', onEditorContentClick);
		return () => {
			editor.getDoc().removeEventListener('click', onEditorContentClick);
		};
	}, [editor, onEditorContentClick]);

	// -----------------------------------------------------------------------------------------
	// Handle onChange event
	// -----------------------------------------------------------------------------------------

	// Need to save the onChange handler to a ref to make sure
	// we call the current one from setTimeout.
	// https://github.com/facebook/react/issues/14010#issuecomment-433788147
	const props_onChangeRef = useRef<Function>();
	props_onChangeRef.current = props.onChange;

	const prop_htmlToMarkdownRef = useRef<Function>();
	prop_htmlToMarkdownRef.current = props.htmlToMarkdown;

	useEffect(() => {
		if (!editor) return () => {};

		let onChangeHandlerIID:any = null;

		function onChangeHandler() {
			const changeId = changeId_++;
			props.onWillChange({ changeId: changeId });

			if (onChangeHandlerIID) clearTimeout(onChangeHandlerIID);

			onChangeHandlerIID = setTimeout(async () => {
				onChangeHandlerIID = null;

				const contentMd = await prop_htmlToMarkdownRef.current(props.contentMarkupLanguage, editor.getContent(), props.contentOriginalCss);

				if (!editor) return;

				lastOnChangeEventContent.current = contentMd;

				props_onChangeRef.current({
					changeId: changeId,
					content: contentMd,
				});

				dispatchDidUpdate(editor);
			}, 1000);
		}

		function onExecCommand(event:any) {
			const c:string = event.command;
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

			const changeCommands = ['mceBlockQuote', 'ToggleJoplinChecklistItem'];

			if (changeCommands.includes(c) || c.indexOf('Insert') === 0 || c.indexOf('mceToggle') === 0 || c.indexOf('mceInsert') === 0) {
				onChangeHandler();
			}
		}

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
		function onKeyUp(event:any) {
			if (['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key)) {
				onChangeHandler();
			}
		}

		async function onPaste(event:any) {
			const pastedText = event.clipboardData.getData('text');

			if (BaseItem.isMarkdownTag(pastedText)) { // Paste a link to a note
				event.preventDefault();
				const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, pastedText, markupRenderOptions({ bodyOnly: true }));
				editor.insertContent(result.html);
			} else { // Paste regular text
				// HACK: TinyMCE doesn't add an undo step when pasting, for unclear reasons
				// so we manually add it here. We also can't do it immediately it seems, or
				// else nothing is added to the stack, so do it on the next frame.
				window.requestAnimationFrame(() => editor.undoManager.add());
				onChangeHandler();
			}
		}

		function onKeyDown(event:any) {
			// Handle "paste as text". Note that when pressing CtrlOrCmd+Shift+V it's going
			// to trigger the "keydown" event but not the "paste" event, so it's ok to process
			// it here and we don't need to do anything special in onPaste
			if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyV') {
				const pastedText = clipboard.readText();
				if (pastedText) editor.insertContent(pastedText);
			}
		}

		editor.on('keyup', onKeyUp);
		editor.on('keydown', onKeyDown);
		editor.on('keypress', onKeypress);
		editor.on('paste', onPaste);
		editor.on('cut', onChangeHandler);
		editor.on('joplinChange', onChangeHandler);
		editor.on('Undo', onChangeHandler);
		editor.on('Redo', onChangeHandler);
		editor.on('ExecCommand', onExecCommand);

		return () => {
			try {
				editor.off('keyup', onKeyUp);
				editor.off('keydown', onKeyDown);
				editor.off('keypress', onKeypress);
				editor.off('paste', onPaste);
				editor.off('cut', onChangeHandler);
				editor.off('joplinChange', onChangeHandler);
				editor.off('Undo', onChangeHandler);
				editor.off('Redo', onChangeHandler);
				editor.off('ExecCommand', onExecCommand);
			} catch (error) {
				console.warn('Error removing events', error);
			}
		};
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

	// Currently we don't handle resource "auto" and "manual" mode with TinyMCE
	// as it is quite complex and probably rarely used.
	function renderDisabledOverlay() {
		const status = resourcesStatus(props.resourceInfos);
		if (status === 'ready') return null;

		const message = _('Please wait for all attachments to be downloaded and decrypted. You may also switch to %s to edit the note.', _('Code View'));
		return (
			<div style={styles.disabledOverlay}>
				<p style={theme.textStyle}>{message}</p>
				<p style={theme.textStyleMinor}>{`Status: ${status}`}</p>
			</div>
		);
	}

	return (
		<div style={styles.rootStyle}>
			{renderDisabledOverlay()}
			<div style={{ width: '100%', height: '100%' }} id={rootIdRef.current}/>
		</div>
	);
};

export default forwardRef(TinyMCE);

