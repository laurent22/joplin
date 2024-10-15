import * as React from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import ToolbarBase from '../ToolbarBase';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { connect } from 'react-redux';
import { buildStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../app.reducer';

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
	return (
		<ToolbarBase
			style={styles.root}
			items={props.toolbarButtonInfos}
			disabled={props.disabled}
			aria-label={_('Note')}
		/>
	);
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

interface ConnectProps {
	windowId: string;
}
const mapStateToProps = (state: AppState, ownProps: ConnectProps) => {
	const whenClauseContext = stateToWhenClauseContext(state, { windowId: ownProps.windowId });

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
