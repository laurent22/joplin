import CommandService from '../CommandService';
import propsHaveChanged from './propsHaveChanged';
import { stateUtils } from 'lib/reducer';

const separatorItem = { type: 'separator' };

export interface ToolbarButtonInfo {
	name: string,
	tooltip: string,
	iconName: string,
	enabled: boolean,
	onClick():void,
	title: string,
}

interface ToolbarButtonCacheItem {
	props: any,
	info: ToolbarButtonInfo,
}

interface ToolbarButtonCache {
	[key:string]: ToolbarButtonCacheItem,
}

export default class ToolbarButtonUtils {

	private service_:CommandService;
	private toolbarButtonCache_:ToolbarButtonCache = {};

	constructor(service:CommandService) {
		this.service_ = service;
	}

	private get service():CommandService {
		return this.service_;
	}

	private commandToToolbarButton(commandName:string, props:any, booleanExpressionContext:any):ToolbarButtonInfo {
		const newEnabled = this.service.isEnabled(commandName, props, booleanExpressionContext);

		if (
			this.toolbarButtonCache_[commandName] &&
			!propsHaveChanged(this.toolbarButtonCache_[commandName].props, props) &&
			this.toolbarButtonCache_[commandName].info.enabled === newEnabled) {
			return this.toolbarButtonCache_[commandName].info;
		}

		const command = this.service.commandByName(commandName, { runtimeMustBeRegistered: true });

		const output = {
			name: commandName,
			tooltip: this.service.label(commandName),
			iconName: command.declaration.iconName,
			enabled: newEnabled,
			onClick: async () => {
				this.service.execute(commandName, props);
			},
			title: this.service.title(commandName, props),
		};

		this.toolbarButtonCache_[commandName] = {
			props: props,
			info: output,
		};

		return this.toolbarButtonCache_[commandName].info;
	}

	// This method ensures that if the provided commandNames and state hasn't changed
	// the output also won't change. Invididual toolbarButtonInfo also won't changed
	// if the state they use hasn't changed. This is to avoid useless renders of the toolbars.
	public commandsToToolbarButtons(state:any, commandNames:string[]):ToolbarButtonInfo[] {
		const output:ToolbarButtonInfo[] = [];

		const booleanExpressionContext = this.service.booleanExpressionContextFromState(state);

		for (const commandName of commandNames) {
			if (commandName === '-') {
				output.push(separatorItem as any);
				continue;
			}

			const props = this.service.commandMapStateToProps(commandName, state);
			output.push(this.commandToToolbarButton(commandName, props, booleanExpressionContext));
		}

		return stateUtils.selectArrayShallow({ array: output }, commandNames.join('_'));
	}

}
