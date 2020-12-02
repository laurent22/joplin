import CommandService from '../CommandService';
import { stateUtils } from '../../reducer';

const separatorItem = { type: 'separator' };

export interface ToolbarButtonInfo {
	name: string;
	tooltip: string;
	iconName: string;
	enabled: boolean;
	onClick(): void;
	title: string;
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

	constructor(service: CommandService) {
		this.service_ = service;
	}

	private get service(): CommandService {
		return this.service_;
	}

	// Editor commands will focus the editor after they're executed
	private isEditorCommand(commandName: string) {
		return (commandName.indexOf('editor.') === 0 ||
				// These commands are grandfathered in, but in the future
				// all editor commands should start with "editor."
				// WARNING: Some commands such as textLink are not defined here
				// because they are more complex and handle focus manually
				commandName === 'textCopy' ||
				commandName === 'textCut' ||
				commandName === 'textPaste' ||
				commandName === 'textSelectAll' ||
				commandName === 'textBold' ||
				commandName === 'textItalic' ||
				commandName === 'textCode' ||
				commandName === 'attachFile' ||
				commandName === 'textNumberedList' ||
				commandName === 'textBulletedList' ||
				commandName === 'textCheckbox' ||
				commandName === 'textHeading' ||
				commandName === 'textHorizontalRule' ||
				commandName === 'insertDateTime'
		);
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
				if (this.isEditorCommand(commandName)) {
					void this.service.execute('editor.focus');
				}
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
