import CommandService from '../CommandService';
export interface ToolbarButtonInfo {
    name: string;
    tooltip: string;
    iconName: string;
    enabled: boolean;
    onClick(): void;
    title: string;
}
export default class ToolbarButtonUtils {
    private service_;
    private toolbarButtonCache_;
    constructor(service: CommandService);
    private get service();
    private commandToToolbarButton;
    commandsToToolbarButtons(state: any, commandNames: string[]): ToolbarButtonInfo[];
}
