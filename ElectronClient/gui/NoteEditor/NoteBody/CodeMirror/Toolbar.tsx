import * as React from 'react';
import CommandService, { ToolbarButtonInfo } from 'lib/services/CommandService';
import ToolbarBase from '../../../ToolbarBase';
import { PluginStates } from 'lib/services/plugins/reducer';
import { connect } from 'react-redux';
import { AppState } from '../../../../app';
import useToolbarItems from './utils/useToolbarItems';
const { buildStyle } = require('lib/theme');

interface ToolbarProps {
	themeId: number,
	plugins: PluginStates,
	toolbarButtonInfos: ToolbarButtonInfo[],
}

function styles_(props:ToolbarProps) {
	return buildStyle('CodeMirrorToolbar', props.themeId, () => {
		return {
			root: {
				flex: 1,
				marginBottom: 0,
			},
		};
	});
}

function Toolbar(props:ToolbarProps) {
	const styles = styles_(props);
	const toolbarItems = useToolbarItems('editorToolbar', props.toolbarButtonInfos, props.plugins);
	return <ToolbarBase style={styles.root} items={toolbarItems} />;
}

const mapStateToProps = (state: AppState) => {
	return {
		toolbarButtonInfos: CommandService.instance().commandsToToolbarButtons(state, [
			'historyBackward',
			'historyForward',
			'startExternalEditing',
			'-',
			'textBold',
			'textItalic',
			'-',
			'textLink',
			'textCode',
			'attachFile',
			'-',
			'textNumberedList',
			'textBulletedList',
			'textCheckbox',
			'textHeading',
			'textHorizontalRule',
			'insertDateTime',
			'toggleEditors',
		]),
		plugins: state.pluginService.plugins,
	};
};

export default connect(mapStateToProps)(Toolbar);
