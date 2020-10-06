/// <reference types="react" />
import { FormNote, ResourceInfos } from './types';
export interface OnLoadEvent {
    formNote: FormNote;
}
interface HookDependencies {
    syncStarted: boolean;
    noteId: string;
    isProvisional: boolean;
    titleInputRef: any;
    editorRef: any;
    onBeforeLoad(event: OnLoadEvent): void;
    onAfterLoad(event: OnLoadEvent): void;
}
export default function useFormNote(dependencies: HookDependencies): {
    isNewNote: boolean;
    formNote: FormNote;
    setFormNote: import("react").Dispatch<import("react").SetStateAction<FormNote>>;
    resourceInfos: ResourceInfos;
};
export {};
