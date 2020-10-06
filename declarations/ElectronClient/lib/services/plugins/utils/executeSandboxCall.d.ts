import Global from '../api/Global';
declare type EventHandler = (callbackId: string, args: any[]) => void;
export default function executeSandboxCall(pluginId: string, sandbox: Global, path: string, args: any[], eventHandler: EventHandler): Promise<any>;
export {};
