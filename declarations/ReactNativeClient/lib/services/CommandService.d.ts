import BaseService from 'lib/services/BaseService';
declare type LabelFunction = () => string;
export interface CommandRuntime {
    execute(props: any): Promise<any>;
    isEnabled?(props: any): boolean;
    mapStateToProps?(state: any): any;
    title?(props: any): string;
}
export interface CommandDeclaration {
    name: string;
    label?: LabelFunction | string;
    parentLabel?: LabelFunction | string;
    iconName?: string;
    tinymceIconName?: string;
    role?: string;
}
export interface Command {
    declaration: CommandDeclaration;
    runtime?: CommandRuntime;
}
interface ReduxStore {
    dispatch(action: any): void;
    getState(): any;
}
interface Utils {
    store: ReduxStore;
}
export declare const utils: Utils;
interface CommandByNameOptions {
    mustExist?: boolean;
    runtimeMustBeRegistered?: boolean;
}
export default class CommandService extends BaseService {
    private static instance_;
    static instance(): CommandService;
    private commands_;
    private commandPreviousStates_;
    initialize(store: any): void;
    on(eventName: string, callback: Function): void;
    off(eventName: string, callback: Function): void;
    commandByName(name: string, options?: CommandByNameOptions): Command;
    registerDeclaration(declaration: CommandDeclaration): void;
    registerRuntime(commandName: string, runtime: CommandRuntime): void;
    componentRegisterCommands(component: any, commands: any[]): void;
    componentUnregisterCommands(commands: any[]): void;
    unregisterRuntime(commandName: string): void;
    execute(commandName: string, props?: any): Promise<any>;
    scheduleExecute(commandName: string, args: any): void;
    isEnabled(commandName: string, props: any): boolean;
    commandMapStateToProps(commandName: string, state: any): any;
    title(commandName: string, props: any): string;
    iconName(commandName: string, variant?: string): string;
    label(commandName: string, fullLabel?: boolean): string;
    exists(commandName: string): boolean;
}
export {};
