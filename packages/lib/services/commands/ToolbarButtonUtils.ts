import CommandService from '../CommandService';
import { stateUtils } from '../../reducer';
import focusEditorIfEditorCommand from './focusEditorIfEditorCommand';
import { WhenClauseContext } from './stateToWhenClauseContext';


export interface ToolbarButtonInfo {
	type: 'button';
	name: string;
	tooltip: string;
	iconName: string;
	enabled: boolean;
	onClick(): void;
	title: string;
}

interface SeparatorItem extends Omit<Partial<ToolbarButtonInfo>, 'type'> {
	type: 'separator';
}

export const separatorItem: SeparatorItem = {
	type: 'separator',
};

export type ToolbarItem = ToolbarButtonInfo|SeparatorItem;

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

	private commandToToolbarButton(commandName: string, whenClauseContext: WhenClauseContext): ToolbarButtonInfo {
		const newEnabled = this.service.isEnabled(commandName, whenClauseContext);
		const newTitle = this.service.title(commandName);
		const newIcon = this.service.iconName(commandName);
		const newLabel = this.service.label(commandName);

		if (
			this.toolbarButtonCache_[commandName] &&
			this.toolbarButtonCache_[commandName].info.enabled === newEnabled &&
			this.toolbarButtonCache_[commandName].info.title === newTitle &&
			this.toolbarButtonCache_[commandName].info.iconName === newIcon &&
			this.toolbarButtonCache_[commandName].info.tooltip === newLabel
		) {
			return this.toolbarButtonCache_[commandName].info;
		}

		const output: ToolbarButtonInfo = {
			type: 'button',
			name: commandName,
			tooltip: newLabel,
			iconName: newIcon,
			enabled: newEnabled,
			onClick: async () => {
				await this.service.execute(commandName);
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public commandsToToolbarButtons(commandNames: string[], whenClauseContext: any): ToolbarItem[] {
		const output: ToolbarItem[] = [];

		for (const commandName of commandNames) {
			if (commandName === '-') {
				output.push(separatorItem);
				continue;
			}

			output.push(this.commandToToolbarButton(commandName, whenClauseContext));
		}

		return stateUtils.selectArrayShallow({ array: output }, commandNames.join('_'));
	}

}
