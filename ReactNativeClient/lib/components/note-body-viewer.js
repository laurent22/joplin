const React = require('react'); const Component = React.Component;
const { Platform, WebView, View } = require('react-native');
const { globalStyle } = require('lib/components/global-style.js');
const Resource = require('lib/models/Resource.js');
const Setting = require('lib/models/Setting.js');
const { reg } = require('lib/registry.js');
const MdToHtml = require('lib/MdToHtml.js');

class NoteBodyViewer extends Component {

	constructor() {
		super();
		this.state = {
			resources: {},
			webViewLoaded: false,
		}

		this.isMounted_ = false;
	}

	UNSAFE_componentWillMount() {
		this.mdToHtml_ = new MdToHtml();
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.mdToHtml_ = null;
		this.isMounted_ = false;
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
		}

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
		return (safeGetNoteProp(this.props, 'body') + '').length !== (safeGetNoteProp(nextProps, 'body') + '').length;
	}

	rebuildMd() {
		this.mdToHtml_.clearCache();
		this.forceUpdate();
	}

	render() {
		const note = this.props.note;
		const style = this.props.style;
		const onCheckboxChange = this.props.onCheckboxChange;

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
		};

		let html = this.mdToHtml_.render(note ? note.body : '', this.props.webViewStyle, mdOptions);

		const injectedJs = this.mdToHtml_.injectedJavaScript();

		html = `
			<!DOCTYPE html>
			<html>
				<head>
					
				</head>
				<body>
					` + html + `
				</body>
			</html>
		`;

		let webViewStyle = {'backgroundColor': this.props.webViewStyle.backgroundColor}
		// On iOS, the onLoadEnd() event is never fired so always
		// display the webview (don't do the little trick
		// to avoid the white flash).
		if (Platform.OS !== 'ios') {
			webViewStyle.opacity = this.state.webViewLoaded ? 1 : 0.01;
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

		// `baseUrl` is where the images will be loaded from. So images must use a path relative to resourceDir.
		const source = {
			html: html,
			baseUrl: 'file://' + Setting.value('resourceDir') + '/',
		};

		return (
			<View style={style}>
				<WebView
					scalesPageToFit={Platform.OS !== 'ios'}
					style={webViewStyle}
					source={source}
					injectedJavaScript={injectedJs}
					originWhitelist={['file://*', './*', 'http://*', 'https://*']}
					mixedContentMode="always"
					allowFileAccess={true}
					onLoadEnd={() => this.onLoadEnd()}
					onError={() => reg.logger().error('WebView error') }
					onMessage={(event) => {
						let msg = event.nativeEvent.data;

						if (msg.indexOf('checkboxclick:') === 0) {
							const newBody = this.mdToHtml_.handleCheckboxClick(msg, this.props.note.body);
							if (onCheckboxChange) onCheckboxChange(newBody);
						} else if (msg.indexOf('bodyscroll:') === 0) {
							//msg = msg.split(':');
							//this.bodyScrollTop_ = Number(msg[1]);
						} else {
							this.props.onJoplinLinkClick(msg);
						}
					}}
				/>
			</View>
		);
	}

}

module.exports = { NoteBodyViewer };