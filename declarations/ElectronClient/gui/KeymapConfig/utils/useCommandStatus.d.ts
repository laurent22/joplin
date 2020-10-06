interface CommandStatus {
    [commandName: string]: boolean;
}
declare const useCommandStatus: () => [CommandStatus, (commandName: string) => void, (commandName: string) => void];
export default useCommandStatus;
