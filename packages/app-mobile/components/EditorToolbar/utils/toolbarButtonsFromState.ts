import { AppState } from '../../../utils/types';
import ToolbarButtonUtils from '@joplin/lib/services/commands/ToolbarButtonUtils';
import CommandService from '@joplin/lib/services/CommandService';
import selectedCommandNamesFromState from './selectedCommandNamesFromState';
import stateToWhenClauseContext from '../../../services/commands/stateToWhenClauseContext';

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

const toolbarButtonsFromState = (state: AppState) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	const commandNames = selectedCommandNamesFromState(state);
	return toolbarButtonUtils.commandsToToolbarButtons(commandNames, whenClauseContext);
};

export default toolbarButtonsFromState;
