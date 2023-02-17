import { useRef, useCallback } from 'react';

import useSource from './hooks/useSource';
import useOnMessage, { HandleMessageCallback, OnMarkForDownloadCallback } from './hooks/useOnMessage';
import useOnResourceLongPress from './hooks/useOnResourceLongPress';

const React = require('react');
import { View } from 'react-native';
import BackButtonDialogBox from '../BackButtonDialogBox';
import { reg } from '@joplin/lib/registry';
import ExtendedWebView from '../ExtendedWebView';

interface Props {
	themeId: number;
	style: any;
	noteBody: string;
	noteMarkupLanguage: number;
	highlightedKeywords: string[];
	noteResources: any;
	paddingBottom: number;
	noteHash: string;
	onJoplinLinkClick: HandleMessageCallback;
	onCheckboxChange?: HandleMessageCallback;
	onRequestEditResource?: HandleMessageCallback;
	onMarkForDownload?: OnMarkForDownloadCallback;
	onLoadEnd?: Function;
}

const webViewStyle = {
	backgroundColor: 'transparent',
};

export default function NoteBodyViewer(props: Props) {
	const dialogBoxRef = useRef(null);

	const { html, injectedJs } = useSource(
		props.noteBody,
		props.noteMarkupLanguage,
		props.themeId,
		props.highlightedKeywords,
		props.noteResources,
		props.paddingBottom,
		props.noteHash
	);

	const onResourceLongPress = useOnResourceLongPress(
		{
			onJoplinLinkClick: props.onJoplinLinkClick,
			onRequestEditResource: props.onRequestEditResource,
		},
		dialogBoxRef
	);

	const onMessage = useOnMessage(
		props.noteBody,
		{
			onCheckboxChange: props.onCheckboxChange,
			onMarkForDownload: props.onMarkForDownload,
			onJoplinLinkClick: props.onJoplinLinkClick,
			onRequestEditResource: props.onRequestEditResource,
			onResourceLongPress,
		}
	);

	const onLoadEnd = useCallback(() => {
		if (props.onLoadEnd) props.onLoadEnd();
	}, [props.onLoadEnd]);

	function onError() {
		reg.logger().error('WebView error');
	}

	const BackButtonDialogBox_ = BackButtonDialogBox as any;

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
	return (
		<View style={props.style}>
			<ExtendedWebView
				webviewInstanceId='NoteBodyViewer'
				themeId={props.themeId}
				style={webViewStyle}
				html={html}
				injectedJavaScript={injectedJs.join('\n')}
				mixedContentMode="always"
				onLoadEnd={onLoadEnd}
				onError={onError}
				onMessage={onMessage}
			/>
			<BackButtonDialogBox_ ref={dialogBoxRef}/>
		</View>
	);
}
