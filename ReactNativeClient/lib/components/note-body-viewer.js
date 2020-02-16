const React = require('react');
const Component = React.Component;
const { Platform, View, Text } = require('react-native');
const { WebView } = require('react-native-webview');
const { themeStyle } = require('lib/components/global-style.js');
const Setting = require('lib/models/Setting.js');
const { reg } = require('lib/registry.js');
const { shim } = require('lib/shim');
const { assetsToHeaders } = require('lib/joplin-renderer');
const shared = require('lib/components/shared/note-screen-shared.js');
const markupLanguageUtils = require('lib/markupLanguageUtils');

import Async from 'react-async';

class NoteBodyViewer extends Component {
	constructor() {
		super();
		this.state = {
			resources: {},
			webViewLoaded: false,
			bodyHtml: '',
		};

		this.isMounted_ = false;

		this.markupToHtml_ = markupLanguageUtils.newMarkupToHtml();

		this.reloadNote = this.reloadNote.bind(this);
	}

	componentDidMount() {
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.markupToHtml_ = null;
		this.isMounted_ = false;
	}

	async reloadNote() {
		const note = this.props.note;
		const theme = themeStyle(this.props.theme);

		const bodyToRender = note ? note.body : '';

		const mdOptions = {
			onResourceLoaded: () => {
				if (this.resourceLoadedTimeoutId_) {
					clearTimeout(this.resourceLoadedTimeoutId_);
					this.resourceLoadedTimeoutId_ = null;
				}

				this.resourceLoadedTimeoutId_ = setTimeout(() => {
					this.resourceLoadedTimeoutId_ = null;
					this.forceUpdate();
				}, 100);
			},
			paddingBottom: '3.8em', // Extra bottom padding to make it possible to scroll past the action button (so that it doesn't overlap the text)
			highlightedKeywords: this.props.highlightedKeywords,
			resources: this.props.noteResources, // await shared.attachedResources(bodyToRender),
			codeTheme: theme.codeThemeCss,
			postMessageSyntax: 'window.ReactNativeWebView.postMessage',
		};

		let result = await this.markupToHtml_.render(note.markup_language, bodyToRender, this.props.webViewStyle, mdOptions);
		let html = result.html;

		const resourceDownloadMode = Setting.value('sync.resourceDownloadMode');

		const injectedJs = [];
		injectedJs.push(shim.injectedJs('webviewLib'));
		injectedJs.push('webviewLib.initialize({ postMessage: msg => { return window.ReactNativeWebView.postMessage(msg); } });');
		injectedJs.push(`
			const readyStateCheckInterval = setInterval(function() {
			    if (document.readyState === "complete") {
			    	clearInterval(readyStateCheckInterval);
			    	if ("${resourceDownloadMode}" === "manual") webviewLib.setupResourceManualDownload();

			    	const hash = "${this.props.noteHash}";
			    	// Gives it a bit of time before scrolling to the anchor
			    	// so that images are loaded.
			    	if (hash) {
				    	setTimeout(() => { 
					    	const e = document.getElementById(hash);
							if (!e) {
								console.warn('Cannot find hash', hash);
								return;
							}
							e.scrollIntoView();
						}, 500);
					}
			    }
			}, 10);
		`);

		html =
			`
			<!DOCTYPE html>
			<html>
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					${assetsToHeaders(result.pluginAssets, { asHtml: true })}
				</head>
				<body>
					${html}
				</body>
			</html>
		`;

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

		// `baseUrl` is where the images will be loaded from. So images must use a path relative to resourceDir.
		return {
			source: {
				html: html,
				baseUrl: `file://${Setting.value('resourceDir')}/`,
			},
			injectedJs: injectedJs,
		};
	}

	onLoadEnd() {
		setTimeout(() => {
			if (this.props.onLoadEnd) this.props.onLoadEnd();
		}, 100);

		if (this.state.webViewLoaded) return;

		// Need to display after a delay to avoid a white flash before
		// the content is displayed.
		setTimeout(() => {
			if (!this.isMounted_) return;
			this.setState({ webViewLoaded: true });
		}, 100);
	}

	shouldComponentUpdate(nextProps, nextState) {
		const safeGetNoteProp = (props, propName) => {
			if (!props) return null;
			if (!props.note) return null;
			return props.note[propName];
		};

		// To address https://github.com/laurent22/joplin/issues/433
		// If a checkbox in a note is ticked, the body changes, which normally would trigger a re-render
		// of this component, which has the unfortunate side effect of making the view scroll back to the top.
		// This re-rendering however is uncessary since the component is already visually updated via JS.
		// So here, if the note has not changed, we prevent the component from updating.
		// This fixes the above issue. A drawback of this is if the note is updated via sync, this change
		// will not be displayed immediately.
		const currentNoteId = safeGetNoteProp(this.props, 'id');
		const nextNoteId = safeGetNoteProp(nextProps, 'id');

		if (currentNoteId !== nextNoteId || nextState.webViewLoaded !== this.state.webViewLoaded) return true;

		// If the length of the body has changed, then it's something other than a checkbox that has changed,
		// for example a resource that has been attached to the note while in View mode. In that case, update.
		return (`${safeGetNoteProp(this.props, 'body')}`).length !== (`${safeGetNoteProp(nextProps, 'body')}`).length;
	}

	rebuildMd() {
		this.forceUpdate();
	}

	render() {
		// Note: useWebKit={false} is needed to go around this bug:
		// https://github.com/react-native-community/react-native-webview/issues/376
		// However, if we add the <meta> tag as described there, it is no longer necessary and WebKit can be used!
		// https://github.com/react-native-community/react-native-webview/issues/312#issuecomment-501991406
		//
		// However, on iOS, due to the bug below, we cannot use WebKit:
		// https://github.com/react-native-community/react-native-webview/issues/312#issuecomment-503754654


		let webViewStyle = { backgroundColor: this.props.webViewStyle.backgroundColor };
		// On iOS, the onLoadEnd() event is never fired so always
		// display the webview (don't do the little trick
		// to avoid the white flash).
		if (Platform.OS !== 'ios') {
			webViewStyle.opacity = this.state.webViewLoaded ? 1 : 0.01;
		}

		return (
			<View style={this.props.style}>
				<Async promiseFn={this.reloadNote}>
					{({ data, error, isPending }) => {
						if (error) {
							console.error(error);
							return <Text>{error.message}</Text>;
						}

						if (isPending) return null;

						return (
							<WebView
								useWebKit={Platform.OS !== 'ios'}
								style={webViewStyle}
								source={data.source}
								injectedJavaScript={data.injectedJs.join('\n')}
								originWhitelist={['file://*', './*', 'http://*', 'https://*']}
								mixedContentMode="always"
								allowFileAccess={true}
								onLoadEnd={() => this.onLoadEnd()}
								onError={() => reg.logger().error('WebView error')}
								onMessage={event => {
									// Since RN 58 (or 59) messages are now escaped twice???
									let msg = unescape(unescape(event.nativeEvent.data));

									console.info('Got IPC message: ', msg);

									if (msg.indexOf('checkboxclick:') === 0) {
										const newBody = shared.toggleCheckbox(msg, this.props.note.body);
										if (this.props.onCheckboxChange) this.props.onCheckboxChange(newBody);
									} else if (msg.indexOf('markForDownload:') === 0) {
										msg = msg.split(':');
										const resourceId = msg[1];
										if (this.props.onMarkForDownload) this.props.onMarkForDownload({ resourceId: resourceId });
									} else {
										this.props.onJoplinLinkClick(msg);
									}
								}}
							/>
						);
					}}
				</Async>
			</View>
		);
	}
}

module.exports = { NoteBodyViewer };
