'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
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
const Resource_1 = require('@joplin/lib/models/Resource');
const bridge_1 = require('../services/bridge');
const contextMenu_1 = require('./NoteEditor/utils/contextMenu');
const contextMenuUtils_1 = require('./NoteEditor/utils/contextMenuUtils');
const CommandService_1 = require('@joplin/lib/services/CommandService');
const styled_components_1 = require('styled-components');
const theme_1 = require('@joplin/lib/theme');
const Window = styled_components_1.default.div `
	height: 100%;
    width: 100%;
    position: fixed;
    top: 0px;
    left: 0px;
    z-index: 999;
    background-color: ${(props) => props.theme.backgroundColor};
	color: ${(props) => props.theme.color};
	`;
const IFrame = styled_components_1.default.iframe `
	height: 100%;
    width: 100%;
    border: none;
	`;
function PdfViewer(props) {
	const iframeRef = react_1.useRef(null);
	const onClose = react_1.useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'pdfViewer',
		});
	}, [props.dispatch]);
	const openExternalViewer = react_1.useCallback(() => __awaiter(this, void 0, void 0, function* () {
		yield CommandService_1.default.instance().execute('openItem', `joplin://${props.resource.id}`);
	}), [props.resource.id]);
	react_1.useEffect(() => {
		const onMessage_ = (event) => __awaiter(this, void 0, void 0, function* () {
			if (!event.data || !event.data.name) {
				return;
			}
			if (event.data.name === 'close') {
				onClose();
			} else if (event.data.name === 'externalViewer') {
				yield openExternalViewer();
			} else if (event.data.name === 'textSelected') {
				const itemType = contextMenuUtils_1.ContextMenuItemType.Text;
				const menu = yield contextMenu_1.default({
					itemType,
					resourceId: null,
					filename: null,
					mime: 'text/plain',
					textToCopy: event.data.text,
					linkToCopy: null,
					htmlToCopy: '',
					insertContent: () => { console.warn('insertContent() not implemented'); },
				}, props.dispatch);
				menu.popup(bridge_1.default().window());
			} else {
				console.error('Unknown event received', event.data.name);
			}
		});
		const iframe = iframeRef.current;
		iframe.contentWindow.addEventListener('message', onMessage_);
		return () => {
			iframe.contentWindow.removeEventListener('message', onMessage_);
		};
	}, [onClose, openExternalViewer, props.dispatch]);
	const theme = theme_1.themeStyle(props.themeId);
	return (React.createElement(Window, { theme: theme },
		React.createElement(IFrame, { src: './vendor/lib/@joplin/pdf-viewer/index.html', 'x-url': Resource_1.default.fullPath(props.resource), 'x-appearance': theme.appearance, ref: iframeRef, 'x-title': props.resource.title, 'x-anchorpage': props.pageNo || 1, 'x-type': 'full' })));
}
exports.default = PdfViewer;
// # sourceMappingURL=PdfViewer.js.map
