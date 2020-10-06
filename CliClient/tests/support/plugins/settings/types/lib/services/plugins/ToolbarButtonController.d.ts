import ViewController from './ViewController';
export declare enum ToolbarButtonLocation {
    NoteToolbar = "noteToolbar",
    EditorToolbar = "editorToolbar"
}
export default class ToolbarButtonController extends ViewController {
    constructor(id: string, pluginId: string, store: any, commandName: string, location: ToolbarButtonLocation);
    get type(): string;
}
