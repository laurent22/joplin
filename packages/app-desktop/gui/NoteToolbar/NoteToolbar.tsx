import * as React from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import ToolbarBase from '../ToolbarBase';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
const { connect } = require('react-redux');
const { buildStyle } = require('@joplin/lib/theme');

interface NoteToolbarProps {
  themeId: number;
  style: any;
  toolbarButtonInfos: ToolbarButtonInfo[];
}

function styles_(props: NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.themeId, (theme: any) => {
		return {
			root: {
				...props.style,
				borderBottom: 'none',
				backgroundColor: theme.backgroundColor,
			},
		};
	});
}

function NoteToolbar(props: NoteToolbarProps) {
	const styles = styles_(props);
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} />;
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

const mapStateToProps = (state: any) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons([
			'toggleEditorFullScreen',
			'showSpellCheckerMenu',
			'editAlarm',
			'toggleVisiblePanes',
			'showNoteProperties',
		].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'noteToolbar')), whenClauseContext),
	};
};

export default connect(mapStateToProps)(NoteToolbar);
