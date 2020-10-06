import { PluginManifest } from './utils/types';
import ViewController from './ViewController';
import { ViewHandle } from './utils/createViewHandle';
export default class Plugin {
    private id_;
    private baseDir_;
    private manifest_;
    private scriptText_;
    private enabled_;
    private logger_;
    private viewControllers_;
    constructor(id: string, baseDir: string, manifest: PluginManifest, scriptText: string, logger: any);
    get id(): string;
    get enabled(): boolean;
    get manifest(): PluginManifest;
    get scriptText(): string;
    get baseDir(): string;
    addViewController(v: ViewController): void;
    viewController(handle: ViewHandle): ViewController;
}
