const React = require('react');
const { connect } = require('react-redux');
const { MdToHtml } = require('lib/markdown-utils.js');

class NoteTextComponent extends React.Component {

	componentWillMount() {
		this.mdToHtml_ = new MdToHtml();

		this.setState({
			note: null,
			webviewReady: false,
		});
	}

	componentDidMount() {
		this.webview_.addEventListener('dom-ready', this.webview_domReady.bind(this));
	}

	componentWillUnmount() {
		this.mdToHtml_ = null;
		this.webview_.addEventListener('dom-ready', this.webview_domReady.bind(this));
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.noteId) this.reloadNote();
	}

	webview_domReady() {
		this.setState({
			webviewReady: true,
		});

		this.webview_.openDevTools(); 

		this.webview_.addEventListener('ipc-message', (event) => {
			const msg = event.channel;

			if (msg.indexOf('checkboxclick:') === 0) {
				const newBody = this.mdToHtml_.handleCheckboxClick(msg, this.state.note.body);
				// this.saveOneProperty('body', newBody);
				//if (onCheckboxChange) onCheckboxChange(newBody);
			}
		})
	}

	async reloadNote() {
		const note = this.props.noteId ? await Note.load(this.props.noteId) : null;
		this.setState({
			note: note,
		});
	}

	render() {
		const note = this.state.note;
		const body = note ? note.body : 'no note';

		if (this.state.webviewReady) {
			const mdOptions = {
				onResourceLoaded: () => {
					this.forceUpdate();
				},
				postMessageSyntax: 'ipcRenderer.sendToHost',
			};

			const html = this.mdToHtml_.render(note ? note.body : '', {}, mdOptions);

			this.webview_.send('setHtml', html);
		}

		const webviewStyle = {
			width: this.props.style.width,
			height: this.props.style.height,
		};

		return (
			<div style={this.props.style}>
				<webview style={webviewStyle} nodeintegration="1" src="note-content.html" ref={elem => this.webview_ = elem} />
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		noteId: state.selectedNoteId,
		notes: state.notes,
	};
};

const NoteText = connect(mapStateToProps)(NoteTextComponent);

module.exports = { NoteText };