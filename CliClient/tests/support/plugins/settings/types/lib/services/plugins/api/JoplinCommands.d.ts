interface Command {
    name: string;
    label: string;
    iconName?: string;
    execute(props: any): Promise<any>;
    isEnabled?(props: any): boolean;
    mapStateToProps?(state: any): any;
}
export default class JoplinCommands {
    /**
     * <span class="platform-desktop">desktop</span> Executes the given command.
     */
    execute(commandName: string, args: any): Promise<void>;
    /**
     * <span class="platform-desktop">desktop</span> Registers the given command.
     */
    register(command: Command): Promise<void>;
}
export {};
