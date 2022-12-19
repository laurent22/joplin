import * as React from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import ToolbarBase from '../../../ToolbarBase';
import { utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { connect } from 'react-redux';
import { AppState } from '../../../../app.reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import stateToWhenClauseContext from '../../../../services/commands/stateToWhenClauseContext';
const { buildStyle } = require('@joplin/lib/theme');

interface ToolbarProps {
	themeId: number;
	toolbarButtonInfos: ToolbarButtonInfo[];
}

function styles_(props: ToolbarProps) {
	return buildStyle('CodeMirrorToolbar', props.themeId, () => {
		return {
			root: {
				flex: 1,
				marginBottom: 0,
			},
		};
	});
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

function Toolbar(props: ToolbarProps) {
	const styles = styles_(props);
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} />;
}

const mapStateToProps = (state: AppState) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	const commandNames = [
		'historyBackward',
		'historyForward',
		'toggleExternalEditing',
		'-',
		'textBold',
		'textItalic',
		'-',
		'textLink',
		'textCode',
		'attachFile',
		'-',
		'textBulletedList',
		'textNumberedList',
		'textCheckbox',
		'textHeading',
		'textHorizontalRule',
		'insertDateTime',
		'toggleEditors',
	].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'editorToolbar'));

	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons(commandNames, whenClauseContext),
	};
};

export default connect(mapStateToProps)(Toolbar);
