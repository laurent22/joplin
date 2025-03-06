import * as React from 'react';
import { useRef, useImperativeHandle, forwardRef, useEffect, useMemo, useContext } from 'react';
import useViewIsReady from './hooks/useViewIsReady';
import useThemeCss from './hooks/useThemeCss';
import useContentSize from './hooks/useContentSize';
import useSubmitHandler from './hooks/useSubmitHandler';
import useHtmlLoader from './hooks/useHtmlLoader';
import useWebviewToPluginMessages from './hooks/useWebviewToPluginMessages';
import useScriptLoader from './hooks/useScriptLoader';
import Logger from '@joplin/utils/Logger';
import { focus } from '@joplin/lib/utils/focusHandler';
import { WindowIdContext } from '../../gui/NewWindowOrIFrame';

const logger = Logger.create('UserWebview');

export interface Props {
	html: string;
	scripts: string[];
	pluginId: string;
	viewId: string;
	themeId: number;
	minWidth?: number;
	minHeight?: number;
	fitToContent?: boolean;
	borderBottom?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	theme?: any;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onSubmit?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onDismiss?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onReady?: Function;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function serializeForm(form: any) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {};
	const formData = new FormData(form);
	for (const key of formData.keys()) {
		output[key] = formData.get(key);
	}
	return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function serializeForms(document: any) {
	const forms = document.getElementsByTagName('form');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {};
	let untitledIndex = 0;

	for (const form of forms) {
		const name = `${form.getAttribute('name')}` || (`form${untitledIndex++}`);
		output[name] = serializeForm(form);
	}

	return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function UserWebview(props: Props, ref: any) {
	const minWidth = props.minWidth ? props.minWidth : 200;
	const minHeight = props.minHeight ? props.minHeight : 20;

	const viewRef = useRef(null);
	const isReady = useViewIsReady(viewRef);
	const cssFilePath = useThemeCss({ pluginId: props.pluginId, themeId: props.themeId });

	useEffect(() => {
		if (isReady && props.onReady) props.onReady();
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [isReady]);

	function frameWindow() {
		if (!viewRef.current) return null;
		return viewRef.current.contentWindow;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function postMessage(name: string, args: any = null) {
		const win = frameWindow();
		if (!win) return;

		logger.debug('Got message', name, args);

		win.postMessage({ target: 'webview', name, args }, '*');
	}

	useImperativeHandle(ref, () => {
		return {
			formData: function() {
				if (viewRef.current) {
					return serializeForms(frameWindow().document);
				} else {
					return null;
				}
			},
			focus: function() {
				if (viewRef.current) focus('UserWebView::focus', viewRef.current);
			},
		};
	});

	const htmlHash = useHtmlLoader(
		frameWindow(),
		isReady,
		postMessage,
		props.html,
	);

	const contentSize = useContentSize(
		frameWindow(),
		htmlHash,
		minWidth,
		minHeight,
		props.fitToContent,
		isReady,
	);

	useSubmitHandler(
		frameWindow(),
		props.onSubmit,
		props.onDismiss,
		htmlHash,
	);

	const windowId = useContext(WindowIdContext);
	useWebviewToPluginMessages(
		frameWindow(),
		isReady,
		props.pluginId,
		props.viewId,
		windowId,
		postMessage,
	);

	useScriptLoader(
		postMessage,
		isReady,
		props.scripts,
		cssFilePath,
	);

	const style = useMemo(() => ({
		'--content-width': `${contentSize.width}px`,
		'--content-height': `${contentSize.height}px`,
	} as React.CSSProperties), [contentSize.width, contentSize.height]);

	return <iframe
		id={props.viewId}
		style={style}
		className={`plugin-user-webview ${props.fitToContent ? '-fit-to-content' : ''} ${props.borderBottom ? '-border-bottom' : ''}`}
		ref={viewRef}
		src="services/plugins/UserWebviewIndex.html"
	></iframe>;
}

export default forwardRef(UserWebview);
