import * as React from 'react';
import versionInfo from 'lib/versionInfo';
const packageInfo = require('../packageInfo.js');
const ipcRenderer = require('electron').ipcRenderer;

export default class ErrorBoundary extends React.Component {

	state:any = { error: null, errorInfo: null };

	componentDidCatch(error:any, errorInfo:any) {
		this.setState({ error: error, errorInfo: errorInfo });
	}

	componentDidMount() {
		const onAppClose = () => {
			ipcRenderer.send('asynchronous-message', 'appCloseReply', {
				canClose: true,
			});
		};

		ipcRenderer.on('appClose', onAppClose);
	}

	render() {
		if (this.state.error) {
			try {
				const output = [];

				output.push(
					<section key="message">
						<h2>Message</h2>
						<p>{this.state.error.message}</p>
					</section>
				);

				output.push(
					<section key="versionInfo">
						<h2>Version info</h2>
						<pre>{versionInfo(packageInfo).message}</pre>
					</section>
				);

				if (this.state.error.stack) {
					output.push(
						<section key="stacktrace">
							<h2>Stack trace</h2>
							<pre>{this.state.error.stack}</pre>
						</section>
					);
				}

				if (this.state.errorInfo) {
					if (this.state.errorInfo.componentStack) {
						output.push(
							<section key="componentStack">
								<h2>Component stack</h2>
								<pre>{this.state.errorInfo.componentStack}</pre>
							</section>
						);
					}
				}

				return (
					<div style={{ overflow: 'auto', fontFamily: 'sans-serif', padding: '5px 20px' }}>
						<h1>Error</h1>
						<p>Joplin encountered a fatal error and could not continue. To report the error, please copy the *entire content* of this page and post it on Joplin forum or GitHub.</p>
						{output}
					</div>
				);
			} catch (error) {
				return (
					<div>
						{JSON.stringify(this.state)}
					</div>
				);
			}
		}

		return this.props.children;
	}
}
