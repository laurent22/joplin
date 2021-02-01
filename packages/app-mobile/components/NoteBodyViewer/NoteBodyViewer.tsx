import { useRef, useMemo, useCallback } from 'react';

import Setting from '@joplin/lib/models/Setting';
import useSource from './hooks/useSource';
import useOnMessage from './hooks/useOnMessage';
import useOnResourceLongPress from './hooks/useOnResourceLongPress';

const React = require('react');
const { View } = require('react-native');
const { WebView } = require('react-native-webview');
const { themeStyle } = require('../global-style.js');
import BackButtonDialogBox from '../BackButtonDialogBox';
import { reg } from '@joplin/lib/registry';

interface Props {
	themeId: number;
	style: any;
	noteBody: string;
	noteMarkupLanguage: number;
	highlightedKeywords: string[];
	noteResources: any;
	paddingBottom: number;
	noteHash: string;
	onJoplinLinkClick: Function;
	onCheckboxChange?: Function;
	onMarkForDownload?: Function;
	onLoadEnd?: Function;
}

export default function NoteBodyViewer(props: Props) {
	const theme = themeStyle(props.themeId);

	const webViewStyle: any = useMemo(() => {
		return { backgroundColor: theme.backgroundColor };
	}, [theme.backgroundColor]);

	const dialogBoxRef = useRef(null);

	const { source, injectedJs } = useSource(
		props.noteBody,
		props.noteMarkupLanguage,
		props.themeId,
		props.highlightedKeywords,
		props.noteResources,
		props.paddingBottom,
		props.noteHash
	);

	const onResourceLongPress = useOnResourceLongPress(
		props.onJoplinLinkClick,
		dialogBoxRef
	);

	const onMessage = useOnMessage(
		props.onCheckboxChange,
		props.noteBody,
		props.onMarkForDownload,
		props.onJoplinLinkClick,
		onResourceLongPress
	);

	const onLoadEnd = useCallback(() => {
		if (props.onLoadEnd) props.onLoadEnd();
	}, [props.onLoadEnd]);

	function onError() {
		reg.logger().error('WebView error');
	}

	// On iOS scalesPageToFit work like this:
	//
	// Find the widest image, resize it *and everything else* by x% so that
	// the image fits within the viewport. The problem is that it means if there's
	// a large image, everything is going to be scaled to a very small size, making
	// the text unreadable.
	//
	// On Android:
	//
	// Find the widest elements and scale them (and them only) to fit within the viewport
	// It means it's going to scale large images, but the text will remain at the normal
	// size.
	//
	// That means we can use scalesPageToFix on Android but not on iOS.
	// The weird thing is that on iOS, scalesPageToFix=false along with a CSS
	// rule "img { max-width: 100% }", works like scalesPageToFix=true on Android.
	// So we use scalesPageToFix=false on iOS along with that CSS rule.
	//
	// 2020-10-15: As we've now fully switched to WebKit for iOS (useWebKit=true) and
	// since the WebView package went through many versions it's possible that
	// the above no longer applies.

	const BackButtonDialogBox_ = BackButtonDialogBox as any;

	return (
		<View style={props.style}>
			<WebView
				theme={theme}
				useWebKit={true}
				allowingReadAccessToURL={`file://${Setting.value('resourceDir')}`}
				style={webViewStyle}
				source={source}
				injectedJavaScript={injectedJs.join('\n')}
				originWhitelist={['file://*', './*', 'http://*', 'https://*']}
				mixedContentMode="always"
				allowFileAccess={true}
				onLoadEnd={onLoadEnd}
				onError={onError}
				onMessage={onMessage}
			/>
			<BackButtonDialogBox_ ref={dialogBoxRef}/>
		</View>
	);
}
