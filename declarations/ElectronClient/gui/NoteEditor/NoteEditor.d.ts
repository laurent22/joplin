/// <reference types="react" />
import { NoteEditorProps } from './utils/types';
declare function NoteEditor(props: NoteEditorProps): JSX.Element;
export { NoteEditor as NoteEditorComponent, };
declare const _default: import("react-redux").ConnectedComponent<typeof NoteEditor, Pick<NoteEditorProps, "bodyEditor">>;
export default _default;
