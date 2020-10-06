/// <reference types="react" />
interface ShareNoteDialogProps {
    themeId: number;
    noteIds: Array<string>;
    onClose: Function;
}
export default function ShareNoteDialog(props: ShareNoteDialogProps): JSX.Element;
export {};
