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
		await Global.browser().tabs.executeScript({file: "/content_scripts/vendor.bundle.js"});
		await Global.browser().tabs.executeScript({file: "/content_scripts/index.js"});
	}

	async componentDidMount() {
		await this.loadContentScripts();
		this.setState({
			contentScriptLoaded: true,
		});

		bridge().sendCommandToActiveTab({
			name: 'pageTitle',
		});
	}

	render() {
		if (!this.state.contentScriptLoaded) return 'Loading...';

		const warningComponent = !this.props.warning ? null : <div>{ this.props.warning }</div>

		return (
			<div className="App">
				<p>Title: { this.props.pageTitle }</p>
				<ul>
					<li><button onClick={this.clipSimplified_click}>Clip simplified page</button></li>
					<li><button onClick={this.clipComplete_click}>Clip complete page</button></li>
				</ul>
				{ warningComponent }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		warning: state.warning,
		pageTitle: state.pageTitle,
	};
};

const App = connect(mapStateToProps)(AppComponent);

export default App;
