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
			selectedTags: [],
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
				tags: this.state.selectedTags.join(','),
			});
		}

		this.clipComplete_click = () => {
			bridge().sendCommandToActiveTab({
				name: 'completePageHtml',
				parent_id: this.props.selectedFolderId,
				tags: this.state.selectedTags.join(','),
			});
		}

		this.clipSelection_click = () => {
			bridge().sendCommandToActiveTab({
				name: 'selectedHtml',
				parent_id: this.props.selectedFolderId,
				tags: this.state.selectedTags.join(','),
			});
		}

		this.clipScreenshot_click = async () => {
			try {
				const baseUrl = await bridge().clipperServerBaseUrl();

				await bridge().sendCommandToActiveTab({
					name: 'screenshot',
					api_base_url: baseUrl,
					parent_id: this.props.selectedFolderId,
					tags: this.state.selectedTags.join(','),
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

		this.tagCompChanged = this.tagCompChanged.bind(this);
		this.onAddTagClick = this.onAddTagClick.bind(this);
		this.onClearTagButtonClick = this.onClearTagButtonClick.bind(this);
	}

	onAddTagClick(event) {
		const newTags = this.state.selectedTags.slice();
		newTags.push('');
		this.setState({ selectedTags: newTags });
		this.focusNewTagInput_ = true;
	}

	onClearTagButtonClick(event) {
		const index = event.target.getAttribute('data-index');
		const newTags = this.state.selectedTags.slice();
		newTags.splice(index, 1);
		this.setState({ selectedTags: newTags });
	}

	tagCompChanged(event) {
		const index = Number(event.target.getAttribute('data-index'));
		const value = event.target.value;

		if (this.state.selectedTags.length <= index) {
			const newTags = this.state.selectedTags.slice();
			newTags.push(value);
			this.setState({ selectedTags: newTags });
		} else {
			if (this.state.selectedTags[index] !== value) {
				const newTags = this.state.selectedTags.slice();
				newTags[index] = value;
				this.setState({ selectedTags: newTags });				
			}
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

	componentDidUpdate() {
		if (this.focusNewTagInput_) {
			this.focusNewTagInput_ = false;
			let lastRef = null;
			for (let i = 0; i < 100; i++) {
				const ref = this.refs['tagSelector' + i];
				if (!ref) break;
				lastRef = ref;
			}
			if (lastRef) lastRef.focus();
		}
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
		} else if (hasContent) {
			previewComponent = (
				<div className="Preview">
					<h2>Preview:</h2>
					<input className={"Title"} value={content.title} onChange={this.contentTitle_change}/>
					<div className={"BodyWrapper"}>
						<div className={"Body"} dangerouslySetInnerHTML={{__html: content.body_html}}></div>
					</div>
					<a className={"Confirm Button"} onClick={this.confirm_click}>Confirm</a>
				</div>
			);
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

		const tagsComp = () => {
			const comps = [];
			for (let i = 0; i < this.state.selectedTags.length; i++) {
				comps.push(<div>
					<input
						ref={'tagSelector' + i}
						data-index={i}
						key={i}
						type="text"
						list="tags"
						value={this.state.selectedTags[i]}
						onChange={this.tagCompChanged}
						onInput={this.tagCompChanged}
					/>
					<a data-index={i} href="#" className="ClearTagButton" onClick={this.onClearTagButtonClick}>[x]</a>
				</div>);
			}
			return (
				<div>
					{comps}
					<a className="AddTagButton" href="#" onClick={this.onAddTagClick}>Add tag</a>
				</div>
			);
		}

		const tagDataListOptions = [];
		for (let i = 0; i < this.props.tags.length; i++) {
			const tag = this.props.tags[i];
			tagDataListOptions.push(<option key={tag.id}>{tag.title}</option>);
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
				<div className="Tags">
					<label>Tags:</label>
					{tagsComp()}
					<datalist id="tags">
						{tagDataListOptions}
					</datalist>
				</div>
				{ warningComponent }
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
		tags: state.tags,
		selectedFolderId: state.selectedFolderId,
	};
};

const App = connect(mapStateToProps)(AppComponent);

export default App;
