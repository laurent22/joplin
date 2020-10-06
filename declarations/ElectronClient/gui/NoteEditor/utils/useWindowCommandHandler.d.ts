import { FormNote } from './types';
interface HookDependencies {
    formNote: FormNote;
    setShowLocalSearch: Function;
    dispatch: Function;
    noteSearchBarRef: any;
    editorRef: any;
    titleInputRef: any;
    saveNoteAndWait: Function;
}
export default function useWindowCommandHandler(dependencies: HookDependencies): void;
export {};
