import * as React from 'react';

const { connect } = require('react-redux');
import { PluginResourceMetric, PluginResourceMonitor } from '../../services/plugins/PluginResourceMonitor';
import { AppState } from '../../app.reducer';
import { _ } from '@joplin/lib/locale';

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

		return (
			<div className='plugin-monitor'>
				<table>
					<tr>
						<th>{_('Plugin')}</th>
						<th>{_('Memory')}</th>
						<th>{_('Peak Memory')}</th>
						<th>{_('CPU')}</th>
						<th>{_('Running')}</th>
						<th>{_('Process ID')}</th>
					</tr>
					{this.state.pluginData.map((plugin: PluginResourceMetric) => {
						return (
							<tr>
								<td>{plugin.name}</td>
								<td>{`${plugin.memory.toLocaleString()} K`}</td>
								<td>{`${plugin.peakMemory.toLocaleString()} K`}</td>
								<td>{`${plugin.cpu.toFixed(2)}%`}</td>
								<td>{plugin.runningStatus ? _('Yes') : _('No')}</td>
								<td>{plugin.osPid}</td>
							</tr>
						);
					})}
				</table>
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

