import CommandService from '../CommandService';
import { stateUtils } from '../../reducer';
import focusEditorIfEditorCommand from './focusEditorIfEditorCommand';
import { WhenClauseContext } from './stateToWhenClauseContext';
import Logger from '@joplin/utils/Logger';
import KeymapService from '../KeymapService';
import { _ } from '../../locale';

const logger = Logger.create('ToolbarButtonUtils');

export interface ToolbarButtonInfo {
	type: 'button';
	name: string;
	tooltip: string;
	iconName: string;
	enabled: boolean;
	visible: boolean;
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

	private commandToToolbarButton(commandName: string, whenClauseContext: WhenClauseContext, keymapService: KeymapService | null): ToolbarButtonInfo {
		const newEnabled = this.service.isEnabled(commandName, whenClauseContext);
		const newVisible = this.service.isVisible(commandName, whenClauseContext);
		const newTitle = this.service.title(commandName);
		const newIcon = this.service.iconName(commandName);
		let newLabel = this.service.label(commandName);


		if (keymapService && keymapService.acceleratorExists(commandName)) {
			const accelerator = keymapService.getDefaultAccelerator(commandName);
			if (accelerator) {
				const label = _('%s (%s)', newLabel, accelerator);
				newLabel = newLabel ? label : accelerator;
			}
		}

		if (
			this.toolbarButtonCache_[commandName] &&
			this.toolbarButtonCache_[commandName].info.enabled === newEnabled &&
			this.toolbarButtonCache_[commandName].info.visible === newVisible &&
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
			visible: newVisible,
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- WhenClauseContext can be partial in tests
	public commandsToToolbarButtons(commandNames: string[], whenClauseContext: any, keymapService: (KeymapService | null) = null): ToolbarItem[] {
		const output: ToolbarItem[] = [];

		for (const commandName of commandNames) {
			if (commandName === '-') {
				const lastItem = output.length > 0 && output[output.length - 1];
				if (lastItem !== separatorItem) {
					output.push(separatorItem);
				}
				continue;
			}

			try {
				const button = this.commandToToolbarButton(commandName, whenClauseContext, keymapService);
				if (button.visible) {
					output.push(button);
				}
			} catch (error) {
				logger.error('Unable to add toolbar button for command', commandName, '. Error: ', error);
			}
		}

		return stateUtils.selectArrayShallow({ array: output }, commandNames.join('_'));
	}

}
