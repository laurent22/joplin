import * as React from 'react';

const { connect } = require('react-redux');
import { AppState } from '../../app.reducer';
import ReactDOM = require('react-dom');
import { PluginResourceMonitor } from '../../services/plugins/PluginResourceMonitor';
import { Dispatch } from 'redux';


interface Props {
	children: React.ReactNode;
	dispatch: Dispatch;
}

interface State {
	isPluginMonitorOpen: boolean;
	themeId: number;
}
class PluginMonitorWindow extends React.Component<Props, State> {
	private windowContainerElement = document.createElement('div');


	public componentDidMount() {

		const pluginMonitorWindow = window.open('', 'PluginMonitor', 'width=800,height=300');

		const stylesheets = document.head.getElementsByTagName('link');
		const styles = Array.from(stylesheets).map(stylesheet => stylesheet.cloneNode());
		pluginMonitorWindow.document.head.append(...styles);

		if (pluginMonitorWindow) {
			pluginMonitorWindow.document.title = 'Plugin Monitor';
			pluginMonitorWindow.document.body.appendChild(this.windowContainerElement);
			pluginMonitorWindow.onpagehide = () => {
				this.props.dispatch({ type: 'RESOURCE_MONITOR_CLOSE' });
				PluginResourceMonitor.instance().window = null;
			};
			PluginResourceMonitor.instance().window = pluginMonitorWindow;
		}
	}

	public render() {
		return ReactDOM.createPortal(this.props.children, this.windowContainerElement) as React.ReactNode;
	}

}

const mapStateToProps = (state: AppState) => {
	return {
		isPluginMonitorOpen: state.isPluginMonitorOpen,
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(PluginMonitorWindow);
