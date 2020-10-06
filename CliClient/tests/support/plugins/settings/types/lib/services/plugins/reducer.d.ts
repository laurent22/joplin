import { Draft } from 'immer';
export interface ViewInfo {
    view: any;
    plugin: any;
}
interface PluginViewState {
    id: string;
    type: string;
}
interface PluginViewStates {
    [key: string]: PluginViewState;
}
interface PluginState {
    id: string;
    views: PluginViewStates;
}
export interface PluginStates {
    [key: string]: PluginState;
}
export interface State {
    plugins: PluginStates;
}
export declare const stateRootKey = "pluginService";
export declare const defaultState: State;
export declare const utils: {
    viewInfosByType: (plugins: PluginStates, type: string) => ViewInfo[];
    commandNamesFromViews: (plugins: PluginStates, toolbarType: string) => string[];
};
declare const reducer: (draft: Draft<any>, action: any) => void;
export default reducer;
