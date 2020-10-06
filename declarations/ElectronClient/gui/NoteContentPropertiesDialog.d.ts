/// <reference types="react" />
interface NoteContentPropertiesDialogProps {
    themeId: number;
    text: string;
    markupLanguage: number;
    onClose: Function;
}
export default function NoteContentPropertiesDialog(props: NoteContentPropertiesDialogProps): JSX.Element;
export {};
