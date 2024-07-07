import * as React from 'react';

const { connect } = require('react-redux');
import { PluginResourceData, PluginResourceMonitor } from '../services/plugins/PluginResourceMonitor';
import { AppState } from '../app.reducer';
const { themeStyle } = require('@joplin/lib/theme');
import PluginService from '@joplin/lib/services/plugins/PluginService';

interface Props {
	themeId: string;
}

interface PluginData {
	osPid: number;
	name: string;
	memory: number;
	peakMemory: number;
	cpu: number;
	runningStatus: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
class PluginMonitorScreen extends React.Component<any, any> {
	public constructor(props: Props) {
		super(props);

		this.state = {
			pluginData: [],
		};
	}

	public async componentDidMount() {
		PluginResourceMonitor.instance().ResourceMonitorGUIUpdate = this.updatePluginData.bind(this);
	}

	public updatePluginData(pluginData: PluginResourceData) {
		const plugins = PluginService.instance().plugins;
		const data: PluginData[] = [];
		for (const plugin in plugins) {
			const osPid = plugins[plugin].osPid;
			data.push({
				osPid,
				name: plugins[plugin].manifest.name,
				memory: pluginData[osPid].memory,
				peakMemory: pluginData[osPid].peakMemory,
				cpu: pluginData[osPid].cpu,
				runningStatus: plugins[plugin].running,
			});
		}

		this.setState({ pluginData: data });
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
		themeId: state.settings.theme,
	};
};

export default connect(mapStateToProps)(PluginMonitorScreen);

