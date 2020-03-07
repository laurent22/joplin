'use strict';
var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const { MarkupToHtml } = require('lib/joplin-renderer');
function findBlockSource(node) {
	const sources = node.getElementsByClassName('joplin-source');
	if (!sources.length)
		throw new Error('No source for node');
	const source = sources[0];
	return {
		openCharacters: source.getAttribute('data-joplin-source-open'),
		closeCharacters: source.getAttribute('data-joplin-source-close'),
		content: source.textContent,
		node: source,
	};
}
function findEditableContainer(node) {
	while (node) {
		if (node.classList && node.classList.contains('joplin-editable'))
			return node;
		node = node.parentNode;
	}
	return null;
}
let loadedAssetFiles_ = [];
let dispatchDidUpdateIID_ = null;
let changeId_ = 1;
const TinyMCE = (props, ref) => {
	const [editor, setEditor] = react_1.useState(null);
	const [scriptLoaded, setScriptLoaded] = react_1.useState(false);
	const attachResources = react_1.useRef(null);
	attachResources.current = props.attachResources;
	const markupToHtml = react_1.useRef(null);
	markupToHtml.current = props.markupToHtml;
	const rootIdRef = react_1.useRef(`tinymce-${Date.now()}${Math.round(Math.random() * 10000)}`);
	const dispatchDidUpdate = (editor) => {
		if (dispatchDidUpdateIID_)
			clearTimeout(dispatchDidUpdateIID_);
		dispatchDidUpdateIID_ = setTimeout(() => {
			dispatchDidUpdateIID_ = null;
			editor.getDoc().dispatchEvent(new Event('joplin-noteDidUpdate'));
		}, 10);
	};
	const onEditorContentClick = react_1.useCallback((event) => {
		if (event.target && event.target.nodeName === 'INPUT' && event.target.getAttribute('type') === 'checkbox') {
			editor.fire('joplinChange');
			dispatchDidUpdate(editor);
		}
	}, [editor]);
	react_1.useImperativeHandle(ref, () => {
		return {
			content: () => editor ? editor.getContent() : '',
			editorContentToHtml(content) {
				return content ? content : '';
			},
		};
	}, [editor]);
	// -----------------------------------------------------------------------------------------
	// Load the TinyMCE library. The lib loads additional JS and CSS files on startup
	// (for themes), and so it needs to be loaded via <script> tag. Requiring it from the
	// module would not load these extra files.
	// -----------------------------------------------------------------------------------------
	react_1.useEffect(() => {
		if (document.getElementById('tinyMceScript')) {
			setScriptLoaded(true);
			return () => { };
		}
		let cancelled = false;
		const script = document.createElement('script');
		script.src = 'node_modules/tinymce/tinymce.min.js';
		script.id = 'tinyMceScript';
		script.onload = () => {
			if (cancelled)
				return;
			setScriptLoaded(true);
		};
		document.getElementsByTagName('head')[0].appendChild(script);
		return () => {
			cancelled = true;
		};
	}, []);
	// -----------------------------------------------------------------------------------------
	// Enable or disable the editor
	// -----------------------------------------------------------------------------------------
	react_1.useEffect(() => {
		if (!editor)
			return;
		editor.setMode(props.disabled ? 'readonly' : 'design');
	}, [editor, props.disabled]);
	// -----------------------------------------------------------------------------------------
	// Create and setup the editor
	// -----------------------------------------------------------------------------------------
	react_1.useEffect(() => {
		if (!scriptLoaded)
			return;
		loadedAssetFiles_ = [];
		const loadEditor = () => __awaiter(void 0, void 0, void 0, function* () {
			const editors = yield window.tinymce.init({
				selector: `#${rootIdRef.current}`,
				plugins: 'noneditable link lists hr',
				noneditable_noneditable_class: 'joplin-editable',
				valid_elements: '*[*]',
				menubar: false,
				toolbar: 'bold italic | link codeformat customAttach | numlist bullist h1 h2 h3 hr',
				setup: (editor) => {
					function openEditDialog(editable) {
						const source = findBlockSource(editable);
						editor.windowManager.open({
							title: 'Edit',
							size: 'large',
							initialData: {
								codeTextArea: source.content,
							},
							onSubmit: (dialogApi) => __awaiter(this, void 0, void 0, function* () {
								const newSource = dialogApi.getData().codeTextArea;
								const md = `${source.openCharacters}${newSource}${source.closeCharacters}`;
								const result = yield markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, { bodyOnly: true });
								editable.outerHTML = result.html;
								source.node.textContent = newSource;
								dialogApi.close();
								editor.fire('joplinChange');
								dispatchDidUpdate(editor);
							}),
							body: {
								type: 'panel',
								items: [
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
					}
					editor.ui.registry.addButton('customAttach', {
						tooltip: 'Attach...',
						icon: 'upload',
						onAction: function() {
							return __awaiter(this, void 0, void 0, function* () {
								const resources = yield attachResources.current();
								const html = [];
								for (const resource of resources) {
									const result = yield markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, resource.markdownTag, { bodyOnly: true });
									html.push(result.html);
								}
								editor.insertContent(html.join('\n'));
								editor.fire('joplinChange');
								dispatchDidUpdate(editor);
							});
						},
					});
					// TODO: remove event on unmount?
					editor.on('DblClick', (event) => {
						const editable = findEditableContainer(event.target);
						if (editable)
							openEditDialog(editable);
					});
					editor.on('ObjectResized', function(event) {
						if (event.target.nodeName === 'IMG') {
							editor.fire('joplinChange');
							dispatchDidUpdate(editor);
						}
					});
				},
			});
			setEditor(editors[0]);
		});
		loadEditor();
	}, [scriptLoaded]);
	// -----------------------------------------------------------------------------------------
	// Set the initial content and load the plugin CSS and JS files
	// -----------------------------------------------------------------------------------------
	react_1.useEffect(() => {
		if (!editor)
			return () => { };
		let cancelled = false;
		const loadContent = () => __awaiter(void 0, void 0, void 0, function* () {
			const result = yield props.markupToHtml(props.defaultEditorState.markupLanguage, props.defaultEditorState.value);
			if (cancelled)
				return;
			editor.setContent(result.html);
			const cssFiles = result.pluginAssets
				.filter((a) => a.mime === 'text/css' && !loadedAssetFiles_.includes(a.path))
				.map((a) => a.path);
			const jsFiles = result.pluginAssets
				.filter((a) => a.mime === 'application/javascript' && !loadedAssetFiles_.includes(a.path))
				.map((a) => a.path);
			for (const cssFile of cssFiles)
				loadedAssetFiles_.push(cssFile);
			for (const jsFile of jsFiles)
				loadedAssetFiles_.push(jsFile);
			if (cssFiles.length)
				editor.dom.loadCSS(cssFiles.join(','));
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
			editor.getDoc().addEventListener('click', onEditorContentClick);
			dispatchDidUpdate(editor);
		});
		loadContent();
		return () => {
			cancelled = true;
			editor.getDoc().removeEventListener('click', onEditorContentClick);
		};
	}, [editor, props.markupToHtml, props.defaultEditorState, onEditorContentClick]);
	// -----------------------------------------------------------------------------------------
	// Handle onChange event
	// -----------------------------------------------------------------------------------------
	// Need to save the onChange handler to a ref to make sure
	// we call the current one from setTimeout.
	// https://github.com/facebook/react/issues/14010#issuecomment-433788147
	const props_onChangeRef = react_1.useRef();
	props_onChangeRef.current = props.onChange;
	react_1.useEffect(() => {
		if (!editor)
			return () => { };
		let onChangeHandlerIID = null;
		const onChangeHandler = () => {
			const changeId = changeId_++;
			props.onWillChange({ changeId: changeId });
			if (onChangeHandlerIID)
				clearTimeout(onChangeHandlerIID);
			onChangeHandlerIID = setTimeout(() => {
				onChangeHandlerIID = null;
				if (!editor)
					return;
				props_onChangeRef.current({
					changeId: changeId,
					content: editor.getContent(),
				});
				dispatchDidUpdate(editor);
			}, 1000);
		};
		editor.on('keyup', onChangeHandler); // TODO: don't trigger for shift, ctrl, etc.
		editor.on('paste', onChangeHandler);
		editor.on('cut', onChangeHandler);
		editor.on('joplinChange', onChangeHandler);
		return () => {
			try {
				editor.off('keyup', onChangeHandler);
				editor.off('paste', onChangeHandler);
				editor.off('cut', onChangeHandler);
				editor.off('joplinChange', onChangeHandler);
			} catch (error) {
				console.warn('Error removing events', error);
			}
		};
	}, [props.onWillChange, props.onChange, editor]);
	return React.createElement('div', { style: props.style, id: rootIdRef.current });
};
exports.default = react_1.forwardRef(TinyMCE);
// # sourceMappingURL=TinyMCE.js.map
