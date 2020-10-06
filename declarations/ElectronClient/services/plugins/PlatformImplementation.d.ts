import { EditorCommand } from 'lib/services/plugins/api/JoplinWorkspace';
interface JoplinWorkspace {
    execEditorCommand(command: EditorCommand): Promise<string>;
}
interface Joplin {
    workspace: JoplinWorkspace;
}
export default class PlatformImplementation {
    private static instance_;
    private joplin_;
    private components_;
    static instance(): PlatformImplementation;
    constructor();
    registerComponent(name: string, component: any): void;
    unregisterComponent(name: string): void;
    get joplin(): Joplin;
}
export {};
