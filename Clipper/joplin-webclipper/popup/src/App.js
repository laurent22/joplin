import React, { Component } from 'react';
import './App.css';

const { connect } = require('react-redux');
const Global = require('./Global');
const { bridge } = require('./bridge');

class AppComponent extends Component {

	constructor() {
		super();

		this.state = ({
			contentScriptLoaded: false,
		});

		this.confirm_click = () => {
			bridge().sendContentToJoplin(this.props.clippedContent);
		}

		this.contentTitle_change = (event) => {
			this.props.dispatch({
				type: 'CLIPPED_CONTENT_TITLE_SET',
				text: event.currentTarget.value
			});		
		}
	}

	async clipSimplified_click() {
		bridge().sendCommandToActiveTab({
			name: 'simplifiedPageHtml',
		});
	}

	clipComplete_click() {
		bridge().sendCommandToActiveTab({
			name: 'completePageHtml',
		});
	}

	async loadContentScripts() {
		await Global.browser().tabs.executeScript({file: "/content_scripts/JSDOMParser.js"});
		await Global.browser().tabs.executeScript({file: "/content_scripts/Readability.js"});
		await Global.browser().tabs.executeScript({file: "/content_scripts/index.js"});
	}

	async componentDidMount() {
		await this.loadContentScripts();
		this.setState({
			contentScriptLoaded: true,
		});
	}

	render() {
		if (!this.state.contentScriptLoaded) return 'Loading...';

		const warningComponent = !this.props.warning ? null : <div className="Warning">{ this.props.warning }</div>

		const hasContent = !!this.props.clippedContent;
		const content = this.props.clippedContent;

		let previewComponent = null;

		const operation = this.props.contentUploadOperation;

		if (operation) {
			let msg = '';

			if (operation.uploading) {
				msg = 'Sending to Joplin...';
			} else if (operation.success) {
				msg = 'Note was successfully created!';
			} else {
				msg = 'There was some error creating the note: ' + operation.errorMessage;
			}

			previewComponent = (
				<div className="Preview">
					<p className="Info">{ msg }</p>
				</div>
			);
		} else {
			if (hasContent) {
				previewComponent = (
					<div className="Preview">
						<input className={"Title"} value={content.title} onChange={this.contentTitle_change}/>
						<div className={"Body"} dangerouslySetInnerHTML={{__html: content.bodyHtml}}></div>
						<a className={"Confirm Button"} onClick={this.confirm_click}>Confirm</a>
					</div>
				);
			} else {
				previewComponent = (
					<div className="Preview">
						<p className="Info">(No preview yet)</p>
					</div>
				);
			}
		}

		return (
			<div className="App">
				<div className="Controls">			
					<ul>
						<li><a className="Button" onClick={this.clipSimplified_click}>Clip simplified page</a></li>
						<li><a className="Button" onClick={this.clipComplete_click}>Clip complete page</a></li>
					</ul>
				</div>
				{ warningComponent }
				<h2>Preview:</h2>
				{ previewComponent }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		warning: state.warning,
		clippedContent: state.clippedContent,
		contentUploadOperation: state.contentUploadOperation,
	};
};

const App = connect(mapStateToProps)(AppComponent);

export default App;
