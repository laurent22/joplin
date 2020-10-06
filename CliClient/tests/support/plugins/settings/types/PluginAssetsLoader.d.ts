export default class PluginAssetsLoader {
    static instance_: PluginAssetsLoader;
    logger_: any;
    static instance(): PluginAssetsLoader;
    setLogger(logger: any): void;
    logger(): any;
    importAssets(): Promise<void>;
}
