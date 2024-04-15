import * as React from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import ToolbarBase from '../ToolbarBase';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
const { connect } = require('react-redux');
import { buildStyle } from '@joplin/lib/theme';

interface NoteToolbarProps {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	style: any;
	toolbarButtonInfos: ToolbarButtonInfo[];
	disabled: boolean;
}

function styles_(props: NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.themeId, theme => {
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
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} disabled={props.disabled}/>;
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state: any) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons([
			'showSpellCheckerMenu',
			'editAlarm',
			'toggleVisiblePanes',
			'showNoteProperties',
		].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'noteToolbar')), whenClauseContext),
	};
};

export default connect(mapStateToProps)(NoteToolbar);
