const React = require('react'); const Component = React.Component;
const { WebView, View, Linking } = require('react-native');
const { globalStyle } = require('lib/components/global-style.js');
const { Resource } = require('lib/models/resource.js');
const { shim } = require('lib/shim.js');
const { reg } = require('lib/registry.js');
const marked = require('lib/marked.js');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;

class NoteBodyViewer extends Component {

	constructor() {
		super();
		this.state = {
			resources: {},
			webViewLoaded: false,
		}

		this.isMounted_ = false;
	}

	async loadResource(id) {
		const resource = await Resource.load(id);
		resource.base64 = await shim.readLocalFileBase64(Resource.fullPath(resource));

		let newResources = Object.assign({}, this.state.resources);
		newResources[id] = resource;
		this.setState({ resources: newResources });
	}

	componentWillMount() {
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	toggleTickAt(body, index) {
		let counter = -1;
		while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0) {
			counter++;

			body = body.replace(/- \[(X| )\]/, function(v, p1) {
				let s = p1 == ' ' ? 'NOTICK' : 'TICK';
				if (index == counter) {
					s = s == 'NOTICK' ? 'TICK' : 'NOTICK';
				}
				return '°°JOP°CHECKBOX°' + s + '°°';
			});
		}

		body = body.replace(/°°JOP°CHECKBOX°NOTICK°°/g, '- [ ]'); 
		body = body.replace(/°°JOP°CHECKBOX°TICK°°/g, '- [X]'); 

		return body;
	}

	markdownToHtml(body, style) {
		// https://necolas.github.io/normalize.css/
		const normalizeCss = `
			html{line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}
			article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}hr{box-sizing:content-box;height:0;overflow:visible}
			pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}
			b,strong{font-weight:bolder}small{font-size:80%}img{border-style:none}
		`;

		const css = `
			body {
				font-size: ` + style.htmlFontSize + `;
				color: ` + style.htmlColor + `;
				line-height: 1.5em;
				background-color: ` + style.htmlBackgroundColor + `;
			}
			h1 {
				font-size: 1.2em;
				font-weight: bold;
			}
			h2 {
				font-size: 1em;
				font-weight: bold;
			}
			a {
				color: ` + style.htmlLinkColor + `
			}
			ul {
				padding-left: 1em;
			}
			a.checkbox {
				font-size: 1.6em;
				position: relative;
				top: 0.1em;
				text-decoration: none;
				color: ` + style.htmlColor + `;
			}
			table {
				border-collapse: collapse;
			}
			td, th {
				border: 1px solid silver;
				padding: .5em 1em .5em 1em;
			}
			hr {
				border: 1px solid ` + style.htmlDividerColor + `;
			}
			img {
				width: 100%;
			}
		`;

		let counter = -1;
		while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0) {
			body = body.replace(/- \[(X| )\]/, function(v, p1) {
				let s = p1 == ' ' ? 'NOTICK' : 'TICK';
				counter++;
				return '°°JOP°CHECKBOX°' + s + '°' + counter + '°°';
			});
		}

		const renderer = new marked.Renderer();

		renderer.link = function (href, title, text) {
			if (Resource.isResourceUrl(href)) {
				return '[Resource not yet supported: ' + htmlentities(text) + ']';
			} else {
				const js = "postMessage(" + JSON.stringify(href) + "); return false;";
				let output = "<a title='" + htmlentities(title) + "' href='#' onclick='" + js + "'>" + htmlentities(text) + '</a>';
				return output;
			}
		}

		renderer.image = (href, title, text) => {
			if (!Resource.isResourceUrl(href)) {
				return '<span>' + href + '</span><img title="' + htmlentities(title) + '" src="' + href + '"/>';
			}

			const resourceId = Resource.urlToId(href);
			if (!this.state.resources[resourceId]) {
				this.loadResource(resourceId);
				return '';
			}

			const r = this.state.resources[resourceId];
			const mime = r.mime.toLowerCase();
			if (mime == 'image/png' || mime == 'image/jpg' || mime == 'image/jpeg' || mime == 'image/gif') {
				const src = 'data:' + r.mime + ';base64,' + r.base64;
				let output = '<img title="' + htmlentities(title) + '" src="' + src + '"/>';
				return output;
			}
			
			return '[Image: ' + htmlentities(r.title) + ' (' + htmlentities(mime) + ')]';
		}

		let styleHtml = '<style>' + normalizeCss + "\n" + css + '</style>';

		let html = body ? styleHtml + marked(body, {
			gfm: true,
			breaks: true,
			renderer: renderer,
			sanitize: true,
		}) : styleHtml;

		let elementId = 1;
		while (html.indexOf('°°JOP°') >= 0) {
			html = html.replace(/°°JOP°CHECKBOX°([A-Z]+)°(\d+)°°/, function(v, type, index) {
				const js = "postMessage('checkboxclick:" + type + ':' + index + "'); this.textContent = this.textContent == '☐' ? '☑' : '☐'; return false;";
				return '<a href="#" onclick="' + js + '" class="checkbox">' + (type == 'NOTICK' ? '☐' : '☑') + '</a>';
			});
		}

		let scriptHtml = '<script>document.body.scrollTop = ' + this.bodyScrollTop_ + ';</script>';

		html = '<body onscroll="postMessage(\'bodyscroll:\' + document.body.scrollTop);">' + html + scriptHtml + '</body>';

		return html;
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
		const html = this.markdownToHtml(note ? note.body : '', this.props.webViewStyle);

		let webViewStyle = {}
		webViewStyle.opacity = this.state.webViewLoaded ? 1 : 0.01;

		return (
			<View style={style}>
				<WebView
					style={webViewStyle}
					source={{ html: html }}
					onLoadEnd={() => this.onLoadEnd()}
					onError={(e) => reg.logger().error('WebView error', e) }
					onMessage={(event) => {
						let msg = event.nativeEvent.data;

						if (msg.indexOf('checkboxclick:') === 0) {
							msg = msg.split(':');
							let index = Number(msg[msg.length - 1]);
							let currentState = msg[msg.length - 2]; // Not really needed but keep it anyway
							const newBody = this.toggleTickAt(note.body, index);
							if (onCheckboxChange) onCheckboxChange(newBody);
						} else if (msg.indexOf('bodyscroll:') === 0) {
							msg = msg.split(':');
							this.bodyScrollTop_ = Number(msg[1]);
						} else {
							Linking.openURL(msg);
						}
					}}
				/>
			</View>
		);
	}

}

export { NoteBodyViewer };