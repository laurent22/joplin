import React, { Component } from 'react';
import './App.css';
import led_red from './led_red.png';
import led_green from './led_green.png';
import led_orange from './led_orange.png';

const { connect } = require('react-redux');
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

		this.clipSimplified_click = () => {
			bridge().sendCommandToActiveTab({
				name: 'simplifiedPageHtml',
				parent_id: this.props.selectedFolderId,
			});
		}

		this.clipComplete_click = () => {
			bridge().sendCommandToActiveTab({
				name: 'completePageHtml',
				parent_id: this.props.selectedFolderId,
			});
		}

		this.clipSelection_click = () => {
			bridge().sendCommandToActiveTab({
				name: 'selectedHtml',
				parent_id: this.props.selectedFolderId,
			});
		}

		this.clipScreenshot_click = async () => {
			try {
				const baseUrl = await bridge().clipperServerBaseUrl();

				await bridge().sendCommandToActiveTab({
					name: 'screenshot',
					api_base_url: baseUrl,
					parent_id: this.props.selectedFolderId,
				});

				window.close();
			} catch (error) {
				this.props.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: false, errorMessage: error.message } });
			}
		}

		this.clipperServerHelpLink_click = () => {
			bridge().tabsCreate({ url: 'https://joplin.cozic.net/clipper' });
		}

		this.folderSelect_change = (event) => {
			this.props.dispatch({
				type: 'SELECTED_FOLDER_SET',
				id: event.target.value,
			});
		}
	}

	async loadContentScripts() {
		await bridge().tabsExecuteScript({file: "/content_scripts/JSDOMParser.js"});
		await bridge().tabsExecuteScript({file: "/content_scripts/Readability.js"});
		await bridge().tabsExecuteScript({file: "/content_scripts/index.js"});
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

			if (operation.searchingClipperServer) {
				msg = 'Searching clipper service... Please make sure that Joplin is running.';
			} else if (operation.uploading) {
				msg = 'Processing note... The note will be available in Joplin as soon as the web page and images have been downloaded and converted. In the meantime you may close this popup.';
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
						<div className={"BodyWrapper"}>
							<div className={"Body"} dangerouslySetInnerHTML={{__html: content.body_html}}></div>
						</div>
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

		const clipperStatusComp = () => {

			const stateToString = function(state) {
				if (state === 'not_found') return 'Not found';
				return state.charAt(0).toUpperCase() + state.slice(1);
			} 

			let msg = ''
			let led = null;
			let helpLink = null;

			const foundState = this.props.clipperServer.foundState
			
			if (foundState === 'found') {
				msg = "Ready on port " + this.props.clipperServer.port
				led = led_green
			} else {
				msg = stateToString(foundState)
				led = foundState === 'searching' ? led_orange : led_red
				if (foundState === 'not_found') helpLink = <a className="Help" onClick={this.clipperServerHelpLink_click} href="help">[Help]</a>
			}

			msg = "Service status: " + msg

			return <div className="StatusBar"><img alt={foundState} className="Led" src={led}/><span className="ServerStatus">{ msg }{ helpLink }</span></div>
		}

		console.info(this.props.selectedFolderId);

		const foldersComp = () => {
			const optionComps = [];

			const nonBreakingSpacify = (s) => {
				// https://stackoverflow.com/a/24437562/561309
				return s.replace(/ /g, "\u00a0");
			}

			const addOptions = (folders, depth) => {
				for (let i = 0; i < folders.length; i++) {
					const folder = folders[i];
					optionComps.push(<option key={folder.id} value={folder.id}>{nonBreakingSpacify('    '.repeat(depth) + folder.title)}</option>)
					if (folder.children) addOptions(folder.children, depth + 1);
				}
			}

			addOptions(this.props.folders, 0);

			return (
				<div className="Folders">
					<label>In notebook: </label>
					<select value={this.props.selectedFolderId || ''} onChange={this.folderSelect_change}>
						{ optionComps }
					</select>
				</div>
			);
		}

		return (
			<div className="App">
				<div className="Controls">			
					<ul>
						<li><a className="Button" onClick={this.clipSimplified_click}>Clip simplified page</a></li>
						<li><a className="Button" onClick={this.clipComplete_click}>Clip complete page</a></li>
						<li><a className="Button" onClick={this.clipSelection_click}>Clip selection</a></li>
						<li><a className="Button" onClick={this.clipScreenshot_click}>Clip screenshot</a></li>
					</ul>
				</div>
				{ foldersComp() }
				{ warningComponent }
				<h2>Preview:</h2>
				{ previewComponent }
				{ clipperStatusComp() }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		warning: state.warning,
		clippedContent: state.clippedContent,
		contentUploadOperation: state.contentUploadOperation,
		clipperServer: state.clipperServer,
		folders: state.folders,
		selectedFolderId: state.selectedFolderId,
	};
};

const App = connect(mapStateToProps)(AppComponent);

export default App;
