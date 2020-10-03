import * as React from 'react';
import CommandService from '../../lib/services/CommandService';
import ToolbarBase from '../ToolbarBase';
import { PluginStates } from 'lib/services/plugins/reducer';
import useToolbarItems from '../NoteEditor/NoteBody/CodeMirror/utils/useToolbarItems';
import { ToolbarButtonInfo } from 'lib/services/CommandService';
const { connect } = require('react-redux');
const { buildStyle } = require('lib/theme');

interface NoteToolbarProps {
	themeId: number,
	style: any,
	plugins: PluginStates,
	toolbarButtonInfos: ToolbarButtonInfo[],
}

function styles_(props:NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.themeId, (theme:any) => {
		return {
			root: {
				...props.style,
				borderBottom: 'none',
				backgroundColor: theme.backgroundColor,
			},
		};
	});
}

function NoteToolbar(props:NoteToolbarProps) {
	const styles = styles_(props);
	const toolbarItems = useToolbarItems('noteToolbar', props.toolbarButtonInfos, props.plugins);
	return <ToolbarBase style={styles.root} items={toolbarItems} />;
}

const mapStateToProps = (state:any) => {
	return {
		plugins: state.pluginService.plugins,
		toolbarButtonInfos: CommandService.instance().commandsToToolbarButtons(state, [
			'editAlarm',
			'toggleVisiblePanes',
			'showNoteProperties',
		]),
	};
};

export default connect(mapStateToProps)(NoteToolbar);
