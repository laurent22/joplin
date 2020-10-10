import * as React from 'react';
import CommandService from 'lib/services/CommandService';
import ToolbarBase from '../../../ToolbarBase';
import { utils as pluginUtils } from 'lib/services/plugins/reducer';
import { connect } from 'react-redux';
import { AppState } from '../../../../app';
import ToolbarButtonUtils, { ToolbarButtonInfo } from 'lib/services/commands/ToolbarButtonUtils';
const { buildStyle } = require('lib/theme');

interface ToolbarProps {
	themeId: number,
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

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

function Toolbar(props:ToolbarProps) {
	const styles = styles_(props);
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} />;
}

const mapStateToProps = (state: AppState) => {
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
		'textNumberedList',
		'textBulletedList',
		'textCheckbox',
		'textHeading',
		'textHorizontalRule',
		'insertDateTime',
		'toggleEditors',
	].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'editorToolbar'));

	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons(state, commandNames),
	};
};

export default connect(mapStateToProps)(Toolbar);
