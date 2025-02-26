import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ScrollOptions, ScrollOptionTypes, EditorCommand, NoteBodyEditorProps } from '../../utils/types';
import { resourcesStatus, commandAttachFileToBody } from '../../utils/resourceHandling';
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
import * as cheerio from 'cheerio';
// import { copyHtmlToClipboard } from '../../utils/clipboardUtils';
import shim from '@joplin/lib/shim';
// import * as PATH from 'path';
// import * as URL from 'url';

const { MarkupToHtml } = require('@joplin/renderer');
const taboverride = require('taboverride');
import { reg } from '@joplin/lib/registry';
//  import BaseItem from '@joplin/lib/models/BaseItem';
import setupToolbarButtons from './utils/setupToolbarButtons';
import Setting from '../../../../../lib/models/Setting';
import NoteListUtils from '../../../utils/NoteListUtils';
const { themeStyle } = require('@joplin/lib/theme');
const { clipboard } = require('electron');
const supportedLocales = require('./supportedLocales');
import { convertATagVideoToVideoTag, modifyJoplinResource } from '../../../../commands/showBrowser';

let gWorker: Worker = undefined;
let gSettingRect = false;

function markupRenderOptions(override: any = null) {
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

function findBlockSource(node: any) {
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

function newBlockSource(language: string = '', content: string = ''): any {
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

function findEditableContainer(node: any): any {
	while (node) {
		if (node.classList && node.classList.contains('joplin-editable')) return node;
		node = node.parentNode;
	}
	return null;
}

function editableInnerHtml(html: string): string {
	const temp = document.createElement('div');
	temp.innerHTML = html;
	const editable = temp.getElementsByClassName('joplin-editable');
	if (!editable.length) throw new Error(`Invalid joplin-editable: ${html}`);
	return editable[0].innerHTML;
}

function dialogTextArea_keyDown(event: any) {
	if (event.key === 'Tab') {
		window.requestAnimationFrame(() => event.target.focus());
	}
}

let markupToHtml_ = new MarkupToHtml();
function stripMarkup(markupLanguage: number, markup: string, options: any = null) {
	if (!markupToHtml_) markupToHtml_ = new MarkupToHtml();
	return	markupToHtml_.stripMarkup(markupLanguage, markup, options);
}

// Allows pressing tab in a textarea to input an actual tab (instead of changing focus)
// taboverride will take care of actually inserting the tab character, while the keydown
// event listener will override the default behaviour, which is to focus the next field.
function enableTextAreaTab(enable: boolean) {
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
	name: string;
	value?: any;
	ui?: boolean;
}

interface JoplinCommandToTinyMceCommands {
	[key: string]: TinyMceCommand;
}

const joplinCommandToTinyMceCommands: JoplinCommandToTinyMceCommands = {
	'textBold': { name: 'mceToggleFormat', value: 'bold' },
	'textItalic': { name: 'mceToggleFormat', value: 'italic' },
	'textLink': { name: 'mceLink' },
	'search': { name: 'SearchReplace' },
};

let loadedCssFiles_: string[] = [];
let loadedJsFiles_: string[] = [];
let dispatchDidUpdateIID_: any = null;
let changeId_: number = 1;

const TinyMCE = (props: NoteBodyEditorProps, ref: any) => {
	const [editor, setEditor] = useState(null);
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const [editorReady, setEditorReady] = useState(false);
	const [draggingStarted, setDraggingStarted] = useState(false);
	const [prevNoteId, setPrevNoteId] = useState('');
	const fragementRef = useRef('');
	const fragmentJumpTimerRef = useRef<null | number>(null);

	const props_onMessage = useRef(null);
	props_onMessage.current = props.onMessage;

	const props_onDrop = useRef(null);
	props_onDrop.current = props.onDrop;

	const markupToHtml = useRef(null);
	markupToHtml.current = props.markupToHtml;

	const lastOnChangeEventInfo = useRef<any>({
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
	useContextMenu(editor, props.plugins);

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
		const htmlElem = convertATagVideoToVideoTag(result.html);
		editor.insertContent(htmlElem.videoText);
		if (htmlElem.videoId) {
			setTimeout(() => {
				const video = editor.getDoc().getElementById(htmlElem.videoId) as HTMLVideoElement;

				video.addEventListener('click', (event: Event) => {
					const target = event.target;
					gSettingRect = true;
					(window as any).tinymceResizeAPI.showResizeRect(target, true);
				});
			}, 1000);
		}
		// editor.fire('joplinChange');
		// dispatchDidUpdate(editor);
	}, [props.markupToHtml, editor]);

	const insertResourcesIntoContentRef = useRef(null);
	insertResourcesIntoContentRef.current = insertResourcesIntoContent;

	const isJoplinSchemeWithFragment = useCallback((href: string) => {
		const joplinScheme = href.toLowerCase().indexOf('joplin://') === 0;
		if (!joplinScheme) {
			return false;
		}
		const jsScheme = href.toLowerCase().indexOf('javascript://') >= 0;
		if (jsScheme) {
			return false;
		}
		return href.indexOf('#') >= 0;

	}, []);

	const getFragmentFromUrl = useCallback((url: string): string => {
		const hashIndex = url.indexOf('#');
		if (hashIndex !== -1) {
			return url.substring(hashIndex);
		}
		return '';
	}, []);

	const clearFragmentJumpTimer = useCallback(() => {
		if (fragmentJumpTimerRef.current !== null) {
			clearTimeout(fragmentJumpTimerRef.current);
			fragmentJumpTimerRef.current = null;
		}
	}, []);

	const executeFragmentJump = useCallback((href: string, retry: boolean, count: number) => {
		const anchorName = href.substr(1);
		// when id is not found, search by name
		const anchor = editor.getDoc().getElementById(anchorName) || editor.getDoc().querySelector(`a[name="${anchorName}"]`);
		if (anchor) {
			anchor.scrollIntoView();
			clearFragmentJumpTimer();
		} else {
			if (retry && count <= 60) {
				console.log(`cannot find retry fragment jump ${count} times. href=${href}`);
				clearFragmentJumpTimer();
				fragmentJumpTimerRef.current = setTimeout(() => {
					executeFragmentJump(href, retry, count + 1);
				}, 1000);
				return;
			}
			// console.log('TinyMce: could not find anchor with ID ', anchorName);
			reg.logger().warn('TinyMce: could not find anchor with ID ', anchorName);
		}
	}, [editor]);

	const onEditorContentClick = useCallback((event: any) => {
		const nodeName = event.target ? event.target.nodeName : '';
		const parentName = event.target?.parentElement?.nodeName;
		clearFragmentJumpTimer();

		if (nodeName === 'INPUT' && event.target.getAttribute('type') === 'checkbox') {
			editor.fire('joplinChange');
			dispatchDidUpdate(editor);
		}

		let targetNodeName = nodeName;
		let targetElement = event.target;
		if (nodeName !== 'A' && parentName === 'A') {
			targetNodeName = parentName;
			targetElement = event.target.parentElement;
		}
		if (targetNodeName === 'A' && (event.ctrlKey || event.metaKey)) {
			const href = targetElement.getAttribute('href');

			if (href.indexOf('#') === 0) {
				executeFragmentJump(href, false, 0);
			} else {
				if (isJoplinSchemeWithFragment(href)) {
					const fragment = getFragmentFromUrl(href);
					console.log(`fragment: ${fragment}`);
					fragementRef.current = fragment;
				} else {
					fragementRef.current = '';
				}
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
			scrollTo: (options: ScrollOptions) => {
				if (!editor) return;

				if (options.type === ScrollOptionTypes.Hash) {
					const anchor = editor.getDoc().getElementById(options.value) || editor.getDoc().querySelector(`a[name="${options.value}"]`);
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
						editor.fire('joplinChange');
						dispatchDidUpdate(editor);

						// It doesn't make sense but it seems calling setContent
						// doesn't create an undo step so we need to call it
						// manually.
						// https://github.com/tinymce/tinymce/issues/3745
						window.requestAnimationFrame(() => editor.undoManager.add());
					},
				};

				if (additionalCommands[cmd.name]) {
					return additionalCommands[cmd.name](cmd.value);
				}

				if (!joplinCommandToTinyMceCommands[cmd.name]) {
					reg.logger().warn('TinyMCE: unsupported Joplin command: ', cmd);
					return false;
				}

				const tinyMceCmd: TinyMceCommand = { ...joplinCommandToTinyMceCommands[cmd.name] };
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

	const loadScript = async (script: any) => {
		return new Promise((resolve) => {
			let element: any = document.createElement('script');
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
				// @ts-ignore
				resolve();
			};

			document.getElementsByTagName('head')[0].appendChild(element);
		});
	};

	useEffect(() => {
		let cancelled = false;

		if (!gWorker) {
			console.log('creating webworker');
			gWorker = new Worker('./WebWorker.js', { type: 'module' });
			// gWorker = new Worker('./WebWorker.js');

		}

		async function loadScripts() {
			const scriptsToLoad: any[] = [
				{
					src: 'node_modules/tinymce/tinymce.js',
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

		void loadScripts();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!editorReady) return () => {};

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
		`));

		return () => {
			document.head.removeChild(element);
		};
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

	const removeNextSiblingBr = useCallback((htmlElement: any, editor: any) => {
		let nextSibling = htmlElement.nextSibling;

		// 次の兄弟要素が <br> であるかを確認
		while (nextSibling && nextSibling.nodeType === 3) { // テキストノードをスキップ
			nextSibling = nextSibling.nextSibling;
		}

		if (nextSibling && nextSibling.nodeName === 'BR') {
			// <br> 要素を取得
			const brElement = nextSibling;
			console.log('次の兄弟要素の <br> 要素:', brElement);
			editor.dom.remove(brElement);
		} else {
			console.log('次の兄弟要素は <br> 要素ではありません。');
		}
	},[]);

	const removeInnerBr = useCallback((htmlElement: any, editor: any) => {
		const brs = htmlElement.querySelectorAll('br');
		console.log(`brCount: ${brs.length}`);
		for (let i = 0; i < brs.length; i++) {
			editor.dom.remove(brs[i]);
		}
	}, []);

	const openMermaidDialog = useCallback((editor: any, initialValue: string, mermaidRootElement: any) => {
		// console.log(`baseId: ${baseId}`);
		return editor.windowManager.open({
			title: 'Mermaid Diagram',
			size: 'large',
			initialData: {
				'diagram': initialValue,
			},
			body: {
				type: 'panel',
				items: [
					{
						type: 'textarea',
						name: 'diagram',
						label: 'Diagram',
					},
				],
			},
			buttons: [
				{
					type: 'cancel',
					text: 'Close',
				},
				{
					type: 'submit',
					text: 'Save',
					primary: true,
				},
			],
			onSubmit: function(api: any) {
				console.log('Mermaid Submit');
				// get textarea input string
				const data = api.getData();
				const inputTxt = data.diagram;
				console.log(`submitted data: ${inputTxt}`);
				updateMermaidDiv(editor, inputTxt, mermaidRootElement);
				api.close();
			},
		});
	}, []);


	const openMathJaxDialog = useCallback((editor: any, initialValue: string, mathjaxRootElement: any, fontsize: string) => {
		// console.log(`baseId: ${baseId}`);
		return editor.windowManager.open({
			title: 'Mathjax Diagram',
			size: 'large',
			initialData: {
				'diagram': initialValue,
				'fontsize': fontsize,
			},
			body: {
				type: 'panel',
				items: [
					{
						type: 'input',
						name: 'fontsize',
						label: 'fontsize',
					},
					{
						type: 'textarea',
						name: 'diagram',
						label: 'Diagram',
					},
				],
			},
			buttons: [
				{
					type: 'cancel',
					text: 'Close',
				},
				{
					type: 'submit',
					text: 'Save',
					primary: true,
				},
			],
			onSubmit: function(api: any) {
				console.log('Mathjax Submit');
				// get textarea input string
				const data = api.getData();
				const inputTxt = data.diagram;
				const fontsize = data.fontsize;
				console.log(`submitted data: ${inputTxt}, fontsize: ${fontsize}`);
				updateMathjaxDiv(editor, inputTxt, mathjaxRootElement, fontsize);
				api.close();
			},
		});
	}, []);

	const openKatexDialog = useCallback((editor: any, initialValue: string, katexRootElement: any, fontsize: string) => {
		// console.log(`baseId: ${baseId}`);
		return editor.windowManager.open({
			title: 'Katex Diagram',
			size: 'large',
			initialData: {
				'diagram': initialValue,
				'fontsize': fontsize,
			},
			body: {
				type: 'panel',
				items: [
					{
						type: 'input',
						name: 'fontsize',
						label: 'fontsize (em)',
					},
					{
						type: 'textarea',
						name: 'diagram',
						label: 'Diagram',
					},
				],
			},
			buttons: [
				{
					type: 'cancel',
					text: 'Close',
				},
				{
					type: 'submit',
					text: 'Save',
					primary: true,
				},
			],
			onSubmit: function(api: any) {
				console.log('Katex Submit');
				// get textarea input string
				const data = api.getData();
				const inputTxt = data.diagram;
				const fontsize = data.fontsize;
				console.log(`submitted data: ${inputTxt}, fontsize: ${fontsize}`);
				updateKatexDiv(editor, inputTxt, katexRootElement, fontsize);
				api.close();
			},
		});
	}, []);

	const insertCommandPre = useCallback((editor: any) => {
		// 現在のカーソル位置に <pre> タグを挿入し、その内部にカーソルを移動させる
		const preElement = document.createElement('pre');
		const preId = `${new Date().getTime()}`;
		preElement.setAttribute('style', 'box-sizing: border-box; overflow: auto; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; font-size: 11px; padding: 8px; margin-top: 0px; margin-bottom: 0px; line-height: 1.42857; word-break: break-all; overflow-wrap: break-word; color: rgb(157, 165, 180); background: rgb(49, 54, 63); border: none; border-radius: 3px; box-shadow: none;');
		// set id to preElement
		preElement.id = preId;
		preElement.innerText = ' ';


		// 現在のカーソル位置に挿入
		editor.selection.setNode(preElement);
		const tcePreElement = editor.dom.select(`pre#${preId}`)[0];
		removeNextSiblingBr(tcePreElement, editor);

		const range = document.createRange();
		range.setStart(tcePreElement, 0);
		range.setEnd(tcePreElement, 0);
		editor.selection.setRng(range);
		editor.nodeChanged();
		editor.focus();
	}, [document]);


	const insertMermaidDiv = useCallback((editor: any) => {
		// 現在のカーソル位置に <pre> タグを挿入し、その内部にカーソルを移動させる
		const divMermaidRoot = document.createElement('div');
		const divMermaidDialog = document.createElement('div');
		const baseId = `${new Date().getTime()}`;



		// set id to preElement
		divMermaidDialog.id = `mermaidJoplinDialog_${baseId}`;
		divMermaidDialog.setAttribute('class', 'mermaid');
		const txt = `sequenceDiagram
		Alice ->> Bob: Hello Bob, how are you?`;

		divMermaidDialog.innerText = `${txt}`;


		divMermaidRoot.id = `mermaidJoplinRoot_${baseId}`;
		divMermaidRoot.setAttribute('mermaidTxt', `${txt}`);

		divMermaidRoot.appendChild(divMermaidDialog);

		// 現在のカーソル位置に挿入
		editor.selection.setNode(divMermaidRoot);
		const tceDivElement = editor.dom.select(`div#${divMermaidDialog.id}`)[0];
		removeNextSiblingBr(tceDivElement, editor);
		removeInnerBr(tceDivElement, editor);

		const divMermaidRootElement = editor.dom.select(`div#${divMermaidRoot.id}`)[0];
		removeNextSiblingBr(divMermaidRootElement, editor);

		const range = document.createRange();
		range.setStart(tceDivElement, 0);
		range.setEnd(tceDivElement, 0);
		editor.selection.setRng(range);
		editor.nodeChanged();
		editor.focus();
		editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
	}, [document]);


	const insertMathJaxDiv = useCallback((editor: any) => {
		// 現在のカーソル位置に <pre> タグを挿入し、その内部にカーソルを移動させる
		const divMathjaxRoot = document.createElement('div');
		const pMathjaxDialog = document.createElement('p');
		const baseId = `${new Date().getTime()}`;



		// set id to preElement
		pMathjaxDialog.id = `mathJaxDialog_${baseId}`;
		pMathjaxDialog.setAttribute('class', 'JoplinMathJax');
		const txt = 'E=mc^2';

		pMathjaxDialog.innerText = `${txt}`;
		const rootId = `mathJaxJoplinRoot_${baseId}`;


		const fontSize = '20';
		divMathjaxRoot.id = `mathJaxJoplinRoot_${baseId}`;
		divMathjaxRoot.setAttribute('mathjaxTxt', `${txt}`);
		divMathjaxRoot.setAttribute('mathjaxFontsize', fontSize);

		divMathjaxRoot.appendChild(pMathjaxDialog);

		// 現在のカーソル位置に挿入
		editor.selection.setNode(divMathjaxRoot);
		const tcePElement = editor.dom.select(`p#${pMathjaxDialog.id}`)[0];
		removeNextSiblingBr(tcePElement, editor);
		removeInnerBr(tcePElement, editor);

		const divMathjaxRootElement = editor.dom.select(`div#${divMathjaxRoot.id}`)[0];
		removeNextSiblingBr(divMathjaxRootElement, editor);

		const range = document.createRange();
		range.setStart(tcePElement, 0);
		range.setEnd(tcePElement, 0);
		editor.selection.setRng(range);
		editor.nodeChanged();
		editor.focus();
		// カスタムイベントの作成とディスパッチ
		const event = new CustomEvent('joplin-mathJaxUpdate', {
			detail: { id: rootId,
				fontSize: fontSize,
			},
		});
		editor.getDoc().dispatchEvent(event);
	}, [document]);

	const insertKatexDiv = useCallback((editor: any) => {
		// 現在のカーソル位置に <pre> タグを挿入し、その内部にカーソルを移動させる
		const divKatexRoot = document.createElement('div');
		const pKatexDialog = document.createElement('p');
		const baseId = `${new Date().getTime()}`;



		// set id to preElement
		pKatexDialog.id = `katexDialog_${baseId}`;
		pKatexDialog.setAttribute('class', 'JoplinKatex');
		const txt = 'c = \\pm\\sqrt{a^2 + b^2}';

		pKatexDialog.innerText = `\\[ ${txt} \\]`;
		const rootId = `katexJoplinRoot_${baseId}`;


		const fontSize = '1.2';
		divKatexRoot.id = `katexJoplinRoot_${baseId}`;
		divKatexRoot.setAttribute('katexTxt', `${txt}`);
		divKatexRoot.setAttribute('katexFontsize', fontSize);

		divKatexRoot.appendChild(pKatexDialog);

		// 現在のカーソル位置に挿入
		editor.selection.setNode(divKatexRoot);
		const tcePElement = editor.dom.select(`p#${pKatexDialog.id}`)[0];
		removeNextSiblingBr(tcePElement, editor);
		removeInnerBr(tcePElement, editor);

		const divKatexRootElement = editor.dom.select(`div#${divKatexRoot.id}`)[0];
		removeNextSiblingBr(divKatexRootElement, editor);

		const range = document.createRange();
		range.setStart(tcePElement, 0);
		range.setEnd(tcePElement, 0);
		editor.selection.setRng(range);
		editor.nodeChanged();
		editor.focus();
		// カスタムイベントの作成とディスパッチ
		const event = new CustomEvent('joplin-kartexUpdate', {
			detail: { id: rootId,
				fontSize: fontSize,
				element: divKatexRootElement,
			},
		});
		editor.getDoc().dispatchEvent(event);
	}, [document]);

	const updateMermaidDiv = useCallback((editor: any, txt: string, mermaidRootElement: any) => {
		const divMermaidRoot = mermaidRootElement;
		divMermaidRoot.setAttribute('mermaidTxt', `${txt}`);
		const baseId = divMermaidRoot.id.split('_')[1];

		divMermaidRoot.innerHTML = '';


		const divMermaidDialog = document.createElement('div');

		divMermaidDialog.id = `mermaidJoplinDialog_${baseId}`;
		divMermaidDialog.setAttribute('class', 'mermaid');
		divMermaidDialog.textContent = `${txt}`;
		removeNextSiblingBr(divMermaidDialog, editor);
		removeInnerBr(divMermaidDialog, editor);


		// append new elements to diveMermaidRoot
		divMermaidRoot.appendChild(divMermaidDialog);

		editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
	},[]);

	const updateMathjaxDiv = useCallback((editor: any, txt: string, mathjaxRootElement: any, fontsize: string) => {
		const divMathjaxRoot = mathjaxRootElement;
		divMathjaxRoot.setAttribute('mathjaxTxt', `${txt}`);
		divMathjaxRoot.setAttribute('mathjaxFontsize', `${fontsize}`);
		const baseId = divMathjaxRoot.id.split('_')[1];

		divMathjaxRoot.innerHTML = '';


		const pMermaidDialog = document.createElement('p');

		pMermaidDialog.id = `mathjaxJoplinDialog_${baseId}`;
		pMermaidDialog.setAttribute('class', 'JoplinMathJax');
		pMermaidDialog.textContent = `${txt}`;
		removeNextSiblingBr(pMermaidDialog, editor);
		removeInnerBr(pMermaidDialog, editor);


		// append new elements to diveMermaidRoot
		divMathjaxRoot.appendChild(pMermaidDialog);
		// カスタムイベントの作成とディスパッチ
		const event = new CustomEvent('joplin-mathJaxUpdate', {
			detail: { id: pMermaidDialog.id,
				fontSize: fontsize },
		});
		editor.getDoc().dispatchEvent(event);
	},[]);

	const updateKatexDiv = useCallback((editor: any, txt: string, mathjaxRootElement: any, fontsize: string) => {
		const divKatexRoot = mathjaxRootElement;
		divKatexRoot.setAttribute('katexTxt', `${txt}`);
		divKatexRoot.setAttribute('katexFontsize', `${fontsize}`);
		const baseId = divKatexRoot.id.split('_')[1];

		divKatexRoot.innerHTML = '';


		const pKatexDialog = document.createElement('p');

		pKatexDialog.id = `katexDialog_${baseId}`;
		pKatexDialog.setAttribute('class', 'JoplinKatex');
		pKatexDialog.textContent = `\\[ ${txt}  \\]`;
		removeNextSiblingBr(pKatexDialog, editor);
		removeInnerBr(pKatexDialog, editor);


		// append new elements to diveMermaidRoot
		divKatexRoot.appendChild(pKatexDialog);
		// カスタムイベントの作成とディスパッチ
		const event = new CustomEvent('joplin-kartexUpdate', {
			detail: { id: pKatexDialog.id,
				fontSize: fontsize,
				element: pKatexDialog },
		});
		editor.getDoc().dispatchEvent(event);
	},[]);


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
				'|', 'fontselect', 'fontsizeselect', 'formatselect',
				'|', 'forecolor', 'backcolor', 'casechange', 'permanentpen', 'formatpainter', 'removeformat',
				'|', 'toc', /* 'example', */ 'cmd', 'mermaid', /* 'mathjax' ,*/ 'katexMath',
			];

			(window as any).tinymce.PluginManager.add('example', function(editor: any, _url: string) {
				const openDialog = function() {
				  return editor.windowManager.open({
						title: 'Example plugin',
						body: {
					  type: 'panel',
					  items: [
								{
						  type: 'input',
						  name: 'title',
						  label: 'Title',
								},
					  ],
						},
						buttons: [
					  {
								type: 'cancel',
								text: 'Close',
					  },
					  {
								type: 'submit',
								text: 'Save',
								primary: true,
					  },
						],
						onSubmit: function(api: any) {
					  const data = api.getData();
					  /* Insert content when the window form is submitted */
					  editor.insertContent(`Title: ${data.title}`);
					  api.close();
						},
				  });
				};
				/* Add a button that opens a window */
				editor.ui.registry.addButton('example', {
				  text: 'My button',
				  onAction: function() {
					/* Open window */
						openDialog();
				  },
				});

				editor.ui.registry.addToggleButton('cmd', {
					tooltip: 'command',
					text: 'Cmd',
					onAction: function() {
						insertCommandPre(editor);
					},
					onSetup: function(api: any) {
						api.setActive(editor.formatter.match('pre'));
						const unbind = editor.formatter.formatChanged('pre', api.setActive).unbind;
						return function() {
							if (unbind) unbind();
						};
					},
				});

				editor.ui.registry.addToggleButton('mermaid', {
					tooltip: 'mermaid',
					text: '図',
					onAction: function() {
						insertMermaidDiv(editor);
					},
					onSetup: function(api: any) {
						api.setActive(editor.formatter.match('div'));
						const unbind = editor.formatter.formatChanged('div', api.setActive).unbind;
						return function() {
							if (unbind) unbind();
						};
					},
				});

				editor.ui.registry.addToggleButton('mathjax', {
					tooltip: 'mathjax',
					text: '式',
					onAction: function() {
						insertMathJaxDiv(editor);
					},
					onSetup: function(api: any) {
						api.setActive(editor.formatter.match('div'));
						const unbind = editor.formatter.formatChanged('div', api.setActive).unbind;
						return function() {
							if (unbind) unbind();
						};
					},
				});

				editor.ui.registry.addToggleButton('katexMath', {
					tooltip: 'katexMath',
					text: '式',
					onAction: function() {
						insertKatexDiv(editor);
					},
					onSetup: function(api: any) {
						api.setActive(editor.formatter.match('div'));
						const unbind = editor.formatter.formatChanged('div', api.setActive).unbind;
						return function() {
							if (unbind) unbind();
						};
					},
				});

				/* Adds a menu item, which can then be included in any menu via the menu/menubar configuration */
				editor.ui.registry.addMenuItem('example', {
				  text: 'Example plugin',
				  onAction: function() {
					/* Open window */
						openDialog();
				  },
				});
				/* Return the metadata for the help plugin */
				return {
				  getMetadata: function() {
						return {
					  name: 'Example plugin',
					  url: 'http://exampleplugindocsurl.com',
						};
				  },
				};
			  });

			(window as any).tinymce.PluginManager.add('text_color_plug', function(editor: any, _url: any) {
				const tinymce = (window as any).tinymce;

				// カスタムコマンドを定義
				editor.addCommand('text_color_command_b', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const color = tinymce.activeEditor.dom.getStyle(node, 'color', true);
					console.log(color);
					const newcolor = '#000000';
					tinymce.activeEditor.execCommand('ForeColor', false, newcolor);
				});

				editor.addCommand('text_color_command_w', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const color = tinymce.activeEditor.dom.getStyle(node, 'color', true);
					console.log(color);
					const newcolor = '#FFFFFF';
					tinymce.activeEditor.execCommand('ForeColor', false, newcolor);
				});

				editor.addCommand('text_color_command_r', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const color = tinymce.activeEditor.dom.getStyle(node, 'color', true);
					console.log(color);
					const newcolor = '#FF0000';
					tinymce.activeEditor.execCommand('ForeColor', false, newcolor);
				});

				editor.addCommand('text_color_command_g', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const color = tinymce.activeEditor.dom.getStyle(node, 'color', true);
					console.log(color);
					const newcolor = 'rgb(22, 145, 121)';
					tinymce.activeEditor.execCommand('ForeColor', false, newcolor);
				});

				editor.addCommand('text_color_command_b', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const color = tinymce.activeEditor.dom.getStyle(node, 'color', true);
					console.log(color);
					const newcolor = 'rgb(35, 111, 161)';
					tinymce.activeEditor.execCommand('ForeColor', false, newcolor);
				});

				editor.addCommand('text_color_command_h', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const color = tinymce.activeEditor.dom.getStyle(node, 'color', true);
					console.log(color);
					const newcolor = 'rgb(52, 73, 94)';
					tinymce.activeEditor.execCommand('ForeColor', false, newcolor);
				});

				editor.addCommand('text_size_command_8', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const fontSize = tinymce.activeEditor.dom.getStyle(node, 'font-size', true);
					console.log(fontSize);
					const newSize = '8pt';
					tinymce.activeEditor.dom.setStyle(node, 'font-size', newSize);
				});

				editor.addCommand('text_size_command_10', function() {
					const node = tinymce.activeEditor.selection.getNode();
					const fontSize = tinymce.activeEditor.dom.getStyle(node, 'font-size', true);
					console.log(fontSize);
					const newSize = '10pt';
					tinymce.activeEditor.dom.setStyle(node, 'font-size', newSize);
				});

				// h1要素に変更するコマンドを追加
				editor.addCommand('change_to_h1', function() {
					tinymce.activeEditor.execCommand('FormatBlock', false, 'h1');
				});

				editor.addCommand('change_to_h2', function() {
					tinymce.activeEditor.execCommand('FormatBlock', false, 'h2');
				});

				editor.addCommand('change_to_h3', function() {
					tinymce.activeEditor.execCommand('FormatBlock', false, 'h3');
				});

				// 箇条書きに変更するコマンドを追加
				editor.addCommand('change_to_ul', function() {
					tinymce.activeEditor.execCommand('InsertUnorderedList');
				});

				// 番号付き箇条書きに変更するコマンドを追加
				editor.addCommand('change_to_ol', function() {
					tinymce.activeEditor.execCommand('InsertOrderedList');
				});



				// ショートカットキーを定義
				// editor.addShortcut('meta+shift+b', 'text_color_desc', 'text_color_command_b');
				editor.addShortcut('meta+shift+w', 'text_color_desc', 'text_color_command_w');
				editor.addShortcut('meta+shift+r', 'text_color_desc', 'text_color_command_r');
				editor.addShortcut('meta+shift+g', 'text_color_desc', 'text_color_command_g');
				editor.addShortcut('meta+shift+p', 'text_color_desc', 'text_color_command_b');
				editor.addShortcut('meta+shift+h', 'text_color_desc', 'text_color_command_h');
				editor.addShortcut('meta+shift+e', 'text_color_desc', 'text_size_command_8');
				editor.addShortcut('meta+shift+t', 'text_color_desc', 'text_size_command_10');
				editor.addShortcut('meta+1', 'text_color_desc', 'change_to_h1');
				editor.addShortcut('meta+2', 'text_color_desc', 'change_to_h2');
				editor.addShortcut('meta+3', 'text_color_desc', 'change_to_h3');
				editor.addShortcut('meta+shift+u', 'text_color_desc', 'change_to_ul'); // 箇条書きに変更するショートカットキー
				editor.addShortcut('meta+shift+o', 'text_color_desc', 'change_to_ol'); // 番号付き箇条書きに変更するショートカットキー
			});

			const editors = await (window as any).tinymce.init({
				selector: `#${rootIdRef.current}`,
				root_name: 'pre',
				content_style: 'body { opacity: 1.0 !important;}',
				width: '100%',
				body_class: 'jop-tinymce',
				height: '100%',
				resize: false,
				icons: 'Joplin',
				icons_url: 'gui/NoteEditor/NoteBody/TinyMCE/icons.js',
				plugins: 'noneditable link, lists, hr, searchreplace, codesample table toc example, text_color_plug',
				noneditable_noneditable_class: 'joplin-editable', // Can be a regex too
				valid_elements: '*[*]', // We already filter in sanitize_html
				menubar: false,
				relative_urls: false,
				branding: false,
				statusbar: false,
				target_list: false,
				table_resize_bars: false,
				language: ['en_US', 'en_GB'].includes(language) ? undefined : language,
				toolbar: toolbar.join(' '),
				localization_function: _,
				contextmenu: false,
				browser_spellcheck: false,
				formats: {
					joplinHighlight: { inline: 'mark', remove: 'all' },
					joplinStrikethrough: { inline: 's', remove: 'all' },
					joplinInsert: { inline: 'ins', remove: 'all' },
					joplinSub: { inline: 'sub', remove: 'all' },
					joplinSup: { inline: 'sup', remove: 'all' },
				},
				setup: (editor: any) => {

					function openEditDialog(editable: any) {
						const source = editable ? findBlockSource(editable) : newBlockSource();

						editor.windowManager.open({
							title: _('Edit'),
							size: 'large',
							initialData: {
								codeTextArea: source.content,
								languageInput: source.language,
							},
							onSubmit: async (dialogApi: any) => {
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

					editor.addShortcut('meta+shift+b', 'Insert pre element', function() {
						console.log('meta+shift+b ==> commandline');
						insertCommandPre(editor);
					});

					editor.ui.registry.addButton('joplinAttach', {
						tooltip: _('Attach file'),
						icon: 'paperclip',
						onAction: async function() {
							insertResourcesIntoContentRef.current();
						},
					});

					setupToolbarButtons(editor);

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
						onSetup: function(api: any) {
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

					// setupContextMenu(editor);

					// TODO: remove event on unmount?
					editor.on('DblClick', (event: any) => {
						const editable = findEditableContainer(event.target);
						if (editable) openEditDialog(editable);
					});

					// Mermaidの図をダブルクリックした場合にダイアログを表示する
					editor.on('DblClick', (e: any) => {
						// console.log(`clicked event: ${e.target.id}`);
						let targetElement = e.target;
						while (targetElement) {
							// console.log(`targetId: ${targetElement.id}`);
							const targetIdPrefix = targetElement.id.split('_')[0];
							if (targetIdPrefix === 'mermaidJoplinRoot') {

								const dialogTxt = targetElement.getAttribute('mermaidTxt');
								openMermaidDialog(editor, dialogTxt, targetElement);
								return; // 処理が行われたのでループを終了
							}
							targetElement = targetElement.parentElement; // 親要素に移動
						}
						// console.log(`not matched with ${divMermaidRoot.id}`);
						// 一致するIDが見つからない場合は何も処理を行わない
					});

					// mathjaxの数式をダブルクリックした場合にダイアログを表示する
					editor.on('DblClick', (e: any) => {
						// console.log(`clicked event: ${e.target.id}`);
						let targetElement = e.target;
						while (targetElement) {
							// console.log(`targetId: ${targetElement.id}`);
							const targetIdPrefix = targetElement.id.split('_')[0];
							if (targetIdPrefix === 'mathJaxJoplinRoot') {

								const dialogTxt = targetElement.getAttribute('mathjaxTxt');
								const fontSize = targetElement.getAttribute('mathjaxFontsize') ?? '20';
								openMathJaxDialog(editor, dialogTxt, targetElement, fontSize);
								return; // 処理が行われたのでループを終了
							}
							targetElement = targetElement.parentElement; // 親要素に移動
						}
						// console.log(`not matched with ${divMermaidRoot.id}`);
						// 一致するIDが見つからない場合は何も処理を行わない
					});

					// mathjaxの数式をダブルクリックした場合にダイアログを表示する
					editor.on('DblClick', (e: any) => {
						// console.log(`clicked event: ${e.target.id}`);
						let targetElement = e.target;
						while (targetElement) {
							// console.log(`targetId: ${targetElement.id}`);
							const targetIdPrefix = targetElement.id.split('_')[0];
							if (targetIdPrefix === 'katexJoplinRoot') {

								const dialogTxt = targetElement.getAttribute('katexTxt');
								const fontSize = targetElement.getAttribute('katexFontsize') ?? '1.2';
								openKatexDialog(editor, dialogTxt, targetElement, fontSize);
								return; // 処理が行われたのでループを終了
							}
							targetElement = targetElement.parentElement; // 親要素に移動
						}
						// console.log(`not matched with ${divMermaidRoot.id}`);
						// 一致するIDが見つからない場合は何も処理を行わない
					});


					// This is triggered when an external file is dropped on the editor
					editor.on('drop', (event: any) => {
						event.preventDefault();
						props_onDrop.current(event);
					});

					editor.on('ObjectResized', function(event: any) {
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

			const resizeAPItemp = (window as any).tinymce?.resizeAPI;
			const resizeAPI = resizeAPItemp(window.getSelection(), editors[0]);
			console.log('resizeAPI', resizeAPI);
			(window as any).tinymceResizeAPI = resizeAPI;
		};

		void loadEditor();
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
			'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
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

	useEffect(() => {
		if (!editor) return () => {};

		if (resourcesStatus(props.resourceInfos) !== 'ready') {
			editor.setContent('');
			return () => {};
		}

		let cancelled = false;



		// const modifyFileSchemeResource = ($: cheerio.Root, resourceDir: string): cheerio.Root => {
		// 	const imgs = $('img[src^="file:///"]');
		// 	for (let i = 0; i < imgs.length; i++) {
		// 		const img = imgs[i] as cheerio.TagElement;
		// 		const src = img.attribs.src;
		// 		const srcPath = URL.parse(src).path;
		// 		const filename = PATH.basename(srcPath);
		// 		const resourceFolderName = PATH.basename(PATH.dirname(srcPath));
		// 		if (resourceFolderName !== PATH.basename(resourceDir)) {
		// 			continue;
		// 		}
		// 		img.attribs.src = PATH.join(resourceDir, filename);
		// 	}

		// 	const anchors = $('a[href^="file:///"]');
		// 	for (let i = 0; i < anchors.length; i++) {
		// 		const anchor = anchors[i] as cheerio.TagElement;
		// 		const href = anchor.attribs.href;
		// 		const srcPath = URL.parse(href).path;
		// 		const filename = PATH.basename(srcPath);
		// 		const resourceFolderName = PATH.basename(PATH.dirname(srcPath));
		// 		if (resourceFolderName !== PATH.basename(resourceDir)) {
		// 			continue;
		// 		}
		// 		anchor.attribs.href = PATH.join(resourceDir, filename);
		// 	}


		// 	return $;
		// };

		const updateSubpagelist = async ($: cheerio.Root, noteId: string): Promise<cheerio.Root> => {
			await NoteListUtils.updateSubpageLists($, noteId);
			return $;
		};

		// const modifyHtmlContent = async(htmlStr: string, resourceDir: string,  noteId: string): Promise<string> => {
		// 	let $ = modifyJoplinResource(htmlStr, resourceDir)
		// 	$ = await updateSubpagelist($, noteId);
		// 	return $.html();
		// }

		const loadContent = async () => {
			if (lastOnChangeEventInfo.current.content !== props.content || lastOnChangeEventInfo.current.resourceInfos !== props.resourceInfos) {
				// const result = await props.markupToHtml(props.contentMarkupLanguage, props.content, markupRenderOptions({ resourceInfos: props.resourceInfos }));
				if (cancelled) return;

				const resourceDir = Setting.value('resourceDir');
				let $ = cheerio.load(props.content);
				// $ = modifyFileSchemeResource($, resourceDir);
				$ = modifyJoplinResource($, resourceDir);
				if (prevNoteId !== props.contentKey) {
					setPrevNoteId(props.contentKey);
					await updateSubpagelist($, props.contentKey);
				}
				const modifiedContent = $.html();
				editor.setContent(modifiedContent);
				if (fragementRef.current) {
					const fragment = fragementRef.current;
					fragementRef.current = '';
					const retry = true;
					const count = 0;
					executeFragmentJump(fragment, retry, count);
					// setTimeout(() => { executeFragmentJump(fragment); }, 1000);
				}

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

			await loadDocumentAssets(editor, await props.allAssets(props.contentMarkupLanguage));


			const videos = editor.getDoc().getElementsByTagName('video');
			for (let i = 0; i < videos.length; i++) {
				const video = videos[i];
				video.addEventListener('click', (event: Event) => {
					const target = event.target;
					(window as any).tinymceResizeAPI.showResizeRect(target, true);
				});

			}

			editor.getDoc().addEventListener('dblclick', () => {
				(window as any).tinymceResizeAPI.hideResizeRect(true);
			});

			// eslint-disable-next-line complexity
			editor.getDoc().addEventListener('mouseup', (event: MouseEvent) => {
				if (gSettingRect) {
					gSettingRect = false;
					return;
				}
				const videos = (editor.getDoc() as Document).querySelectorAll('video[data-mce-selected="1"]');
				// get click coordinates
				const x = event.clientX;
				const y = event.clientY;
				const offset = 10;
				for (let i = 0; i < videos.length; i++) {
					const video = videos[i];
					const rect = video.getBoundingClientRect();
					// const isOutsideBoundary =
					// 		x < rect.left - offset || // 左境界より左
					// 		x > rect.right + offset || // 右境界より右
					// 		y < rect.top - offset || // 上境界より上
					// 		y > rect.bottom + offset; // 下境界より下

					const isOutsideCorners =
							!(
								(x >= rect.left - offset && x <= rect.left + offset && y >= rect.top - offset && y <= rect.top + offset) || // 左上
							(x >= rect.right - offset && x <= rect.right + offset && y >= rect.top - offset && y <= rect.top + offset) || // 右上
							(x >= rect.left - offset && x <= rect.left + offset && y >= rect.bottom - offset && y <= rect.bottom + offset) || // 左下
							(x >= rect.right - offset && x <= rect.right + offset && y >= rect.bottom - offset && y <= rect.bottom + offset) // 右下
							);
					if (isOutsideCorners) {
					// クリックした座標がvideoの四隅ではない場合、選択を解除する
						video.setAttribute('data-mce-selected', '0');
						(window as any).tinymceResizeAPI.hideResizeRect(true);

					}
				}

			});
			dispatchDidUpdate(editor);
		};

		void loadContent();

		return () => {
			cancelled = true;
		};
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
	const props_onChangeRef = useRef<Function>();
	props_onChangeRef.current = props.onChange;

	const prop_htmlToMarkdownRef = useRef<Function>();
	prop_htmlToMarkdownRef.current = props.htmlToMarkdown;

	const nextOnChangeEventInfo = useRef<any>(null);

	async function execOnChangeEvent() {
		const info = nextOnChangeEventInfo.current;
		if (!info) return;

		nextOnChangeEventInfo.current = null;
		editor.execCommand('mceUpdateToc');
		const contentMd = await prop_htmlToMarkdownRef.current(info.contentMarkupLanguage, info.editor.getContent(), info.contentOriginalCss);
		const resourceDir = Setting.value('resourceDir');

		gWorker.onmessage = (event: MessageEvent) => {
			const modifiedMd = event.data;
			// console.log(`main modifiedMd: ${modifiedMd}`);
			lastOnChangeEventInfo.current.content = modifiedMd;
			props_onChangeRef.current({
				changeId: info.changeId,
				content: modifiedMd,
			});
			dispatchDidUpdate(info.editor);
		};

		gWorker.postMessage({ md: contentMd, resourceDir: resourceDir });

		// const modifiedMd: string = revertResourceDirToJoplinScheme(contentMd, resourceDir).html();
	}

	// When the component unmount, we dispatch the change event
	// that was scheduled so that the parent component can save
	// the note.
	useEffect(() => {
		return () => {
			void execOnChangeEvent();
		};
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

		async function onPaste(_event: any) {
			console.log('onPaste');
			onChangeHandler();
		}

		// async function onCopy(event: any) {
		// 	const copiedContent = editor.selection.getContent();
		// 	copyHtmlToClipboard(copiedContent);
		// 	event.preventDefault();
		// }

		// async function onCut(event: any) {
		// 	const selectedContent = editor.selection.getContent();
		// 	copyHtmlToClipboard(selectedContent);
		// 	editor.insertContent('');
		// 	event.preventDefault();
		// 	onChangeHandler();
		// }

		function onKeyDown(event: any) {
			// It seems "paste as text" is handled automatically by
			// on Windows so the code below so we need to run the below
			// code only on macOS (and maybe Linux). If we were to run
			// this on Windows we would have this double-paste issue:
			// https://github.com/laurent22/joplin/issues/4243

			// Handle "paste as text". Note that when pressing CtrlOrCmd+Shift+V it's going
			// to trigger the "keydown" event but not the "paste" event, so it's ok to process
			// it here and we don't need to do anything special in onPaste
			if (!shim.isWindows()) {
				if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyV') {
					const pastedText = clipboard.readText();
					if (pastedText) {
						editor.insertContent(pastedText);
						// execOnChangeEvent();
					}
				}
			}
		}

		editor.on('keyup', onKeyUp);
		editor.on('keydown', onKeyDown);
		// editor.on('paste_postprocess', onPaste);
		editor.on('keypress', onKeypress);
		editor.on('paste', onPaste);
		// editor.on('copy', onCopy);
		// `compositionend` means that a user has finished entering a Chinese
		// (or other languages that require IME) character.
		editor.on('compositionend', onChangeHandler);
		// editor.on('cut', onCut);
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
				// editor.off('copy', onCopy);
				editor.off('compositionend', onChangeHandler);
				// editor.off('cut', onCut);
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
					disabled={props.disabled}
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

