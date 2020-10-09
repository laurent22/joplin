import * as React from 'react';
import CommandService from 'lib/services/CommandService';
import ToolbarBase from '../ToolbarBase';
import { utils as pluginUtils } from 'lib/services/plugins/reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from 'lib/services/commands/ToolbarButtonUtils';
const { connect } = require('react-redux');
const { buildStyle } = require('lib/theme');

interface NoteToolbarProps {
	themeId: number,
	style: any,
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
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} />;
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

const mapStateToProps = (state:any) => {
	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons(state, [
			'editAlarm',
			'toggleVisiblePanes',
			'showNoteProperties',
		].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'noteToolbar'))),
	};
};

export default connect(mapStateToProps)(NoteToolbar);
