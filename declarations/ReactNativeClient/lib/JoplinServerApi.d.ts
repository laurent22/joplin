interface JoplinServerApiOptions {
    username: Function;
    password: Function;
    baseUrl: Function;
}
export default class JoplinServerApi {
    logger_: any;
    options_: JoplinServerApiOptions;
    kvStore_: any;
    constructor(options: JoplinServerApiOptions);
    setLogger(l: any): void;
    logger(): any;
    setKvStore(v: any): void;
    kvStore(): any;
    authToken(): string;
    baseUrl(): string;
    static baseUrlFromNextcloudWebDavUrl(webDavUrl: string): string;
    syncTargetId(settings: any): any;
    static connectionErrorMessage(error: any): any;
    setupSyncTarget(webDavUrl: string): Promise<any>;
    requestToCurl_(url: string, options: any): string;
    exec(method: string, path?: string, body?: any, headers?: any, options?: any): Promise<any>;
}
export {};
