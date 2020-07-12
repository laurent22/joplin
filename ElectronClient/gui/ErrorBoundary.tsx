import * as React from 'react';

export default class ErrorBoundary extends React.Component {

	state:any = { error: null, errorInfo: null };

	componentDidCatch(error:any, errorInfo:any) {
		this.setState({ error: error, errorInfo: errorInfo });
	}

	render() {
		if (this.state.error) {
			try {
				const output = [];
				output.push(<h2>Message</h2>);
				output.push(<p>{this.state.error.message}</p>);

				if (this.state.error.stack) {
					output.push(<h2>Stack trace</h2>);
					output.push(<pre>{this.state.error.stack}</pre>);
				}

				if (this.state.errorInfo) {
					if (this.state.errorInfo.componentStack) {
						output.push(<h2>Component stack</h2>);
						output.push(<pre>{this.state.errorInfo.componentStack}</pre>);
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
