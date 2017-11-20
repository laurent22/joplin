const React = require('react'); const Component = React.Component;
const { Platform, WebView, View, Linking } = require('react-native');
const { globalStyle } = require('lib/components/global-style.js');
const { Resource } = require('lib/models/resource.js');
const { Setting } = require('lib/models/setting.js');
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

	componentWillMount() {
		this.mdToHtml_ = new MdToHtml({ supportsResourceLinks: false });
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.mdToHtml_ = null;
		this.isMounted_ = false;
	}

	onLoadEnd() {
		if (this.state.webViewLoaded) return;

		// Need to display after a delay to avoid a white flash before
		// the content is displayed.
		setTimeout(() => {
			if (!this.isMounted_) return;
			this.setState({ webViewLoaded: true });
		}, 100);
	}

	render() {
		const note = this.props.note;
		const style = this.props.style;
		const onCheckboxChange = this.props.onCheckboxChange;

		const mdOptions = {
			onResourceLoaded: () => {
				this.forceUpdate();
			},
		};

		const html = this.mdToHtml_.render(note ? note.body : '', this.props.webViewStyle, mdOptions);

		let webViewStyle = {}
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

		return (
			<View style={style}>
				<WebView
					scalesPageToFit={Platform.OS !== 'ios'}
					style={webViewStyle}
					{/* baseUrl is where the images will be loaded from. So images must use a path relative to resourceDir. */}
					source={{ html: html, baseUrl: 'file://' + Setting.value('resourceDir') + '/' }}
					onLoadEnd={() => this.onLoadEnd()}
					onError={(e) => reg.logger().error('WebView error', e) }
					onMessage={(event) => {
						let msg = event.nativeEvent.data;

						if (msg.indexOf('checkboxclick:') === 0) {
							const newBody = this.mdToHtml_.handleCheckboxClick(msg, note.body);
							if (onCheckboxChange) onCheckboxChange(newBody);
						} else if (msg.indexOf('bodyscroll:') === 0) {
							//msg = msg.split(':');
							//this.bodyScrollTop_ = Number(msg[1]);
						} else {
							Linking.openURL(msg);
						}
					}}
				/>
			</View>
		);
	}

}

module.exports = { NoteBodyViewer };