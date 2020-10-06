import { State } from 'lib/reducer';
import BaseApplication from 'lib/BaseApplication';
interface AppStateRoute {
    type: string;
    routeName: string;
    props: any;
}
export interface AppState extends State {
    route: AppStateRoute;
    navHistory: any[];
    noteVisiblePanes: string[];
    sidebarVisibility: boolean;
    noteListVisibility: boolean;
    windowContentSize: any;
    watchedNoteFiles: string[];
    lastEditorScrollPercents: any;
    devToolsVisible: boolean;
    visibleDialogs: any;
    focusedField: string;
    watchedResources: any;
}
declare class Application extends BaseApplication {
    constructor();
    hasGui(): boolean;
    checkForUpdateLoggerPath(): string;
    reducer(state: AppState, action: any): AppState;
    toggleDevTools(visible: boolean): void;
    generalMiddleware(store: any, next: any, action: any): Promise<any>;
    handleThemeAutoDetect(): void;
    bridge_nativeThemeUpdated(): void;
    updateTray(): void;
    updateEditorFont(): void;
    loadCustomCss(filePath: string): Promise<string>;
    start(argv: string[]): Promise<any>;
}
declare function app(): Application;
export default app;
