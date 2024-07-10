import * as React from 'react';

const { connect } = require('react-redux');
import { PluginResourceMetric, PluginResourceMonitor } from '../../services/plugins/PluginResourceMonitor';
import { AppState } from '../../app.reducer';
const { themeStyle } = require('@joplin/lib/theme');

interface Props {
	themeId: string;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
class PluginMonitorScreen extends React.Component<any, any> {
	public constructor(props: Props) {
		super(props);

		this.state = {
			pluginData: PluginResourceMonitor.instance().resourceMetrics,
		};
	}

	public async componentDidMount() {
		PluginResourceMonitor.instance().ResourceMonitorGUIUpdate = this.updatePluginData.bind(this);
	}

	public updatePluginData(pluginData: PluginResourceMetric[]) {
		this.setState({ pluginData });
	}

	public render() {
		const theme = themeStyle(this.props.themeId);

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.backgroundColor }}>
				<div style={{ padding: theme.configScreenPadding, flex: 1, color: theme.color }}>
					{JSON.stringify(this.state.pluginData)}
				</div>
			</div>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		state: state.appState,
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(PluginMonitorScreen);

