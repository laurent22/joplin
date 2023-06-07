import CommandService from '../CommandService';
import { stateUtils } from '../../reducer';
import focusEditorIfEditorCommand from './focusEditorIfEditorCommand';

const separatorItem = { type: 'separator' };

export interface ToolbarButtonInfo {
	name: string;
	tooltip: string;
	iconName: string;
	enabled: boolean;
	onClick(): void;
	title: string;
	updateExternalClicked?: (value: boolean)=> void;
	externalClickedState?: boolean;
}

interface ToolbarButtonCacheItem {
	info: ToolbarButtonInfo;
}

interface ToolbarButtonCache {
	[key: string]: ToolbarButtonCacheItem;
}

export default class ToolbarButtonUtils {

	private service_: CommandService;
	private toolbarButtonCache_: ToolbarButtonCache = {};

	public constructor(service: CommandService) {
		this.service_ = service;
	}

	private get service(): CommandService {
		return this.service_;
	}

	private commandToToolbarButton(commandName: string, whenClauseContext: any): ToolbarButtonInfo {
		const newEnabled = this.service.isEnabled(commandName, whenClauseContext);
		const newTitle = this.service.title(commandName);

		if (
			this.toolbarButtonCache_[commandName] &&
			this.toolbarButtonCache_[commandName].info.enabled === newEnabled &&
			this.toolbarButtonCache_[commandName].info.title === newTitle
		) {
			return this.toolbarButtonCache_[commandName].info;
		}

		const command = this.service.commandByName(commandName, { runtimeMustBeRegistered: true });

		const output = {
			name: commandName,
			tooltip: this.service.label(commandName),
			iconName: command.declaration.iconName,
			enabled: newEnabled,
			onClick: async () => {
				void this.service.execute(commandName);
				void focusEditorIfEditorCommand(commandName, this.service);
			},
			title: newTitle,
		};

		this.toolbarButtonCache_[commandName] = {
			info: output,
		};

		return this.toolbarButtonCache_[commandName].info;
	}

	// This method ensures that if the provided commandNames and state hasn't changed
	// the output also won't change. Invididual toolbarButtonInfo also won't changed
	// if the state they use hasn't changed. This is to avoid useless renders of the toolbars.
	public commandsToToolbarButtons(commandNames: string[], whenClauseContext: any): ToolbarButtonInfo[] {
		const output: ToolbarButtonInfo[] = [];

		for (const commandName of commandNames) {
			if (commandName === '-') {
				output.push(separatorItem as any);
				continue;
			}

			output.push(this.commandToToolbarButton(commandName, whenClauseContext));
		}

		return stateUtils.selectArrayShallow({ array: output }, commandNames.join('_'));
	}

}
