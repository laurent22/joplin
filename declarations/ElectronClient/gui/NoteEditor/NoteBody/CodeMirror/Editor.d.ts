import * as React from 'react';
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/matchesonscrollbar';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';
import 'codemirror/keymap/sublime';
import 'codemirror/mode/meta';
export interface EditorProps {
    value: string;
    searchMarkers: any;
    mode: string;
    style: any;
    codeMirrorTheme: any;
    readOnly: boolean;
    autoMatchBraces: boolean;
    keyMap: string;
    onChange: any;
    onScroll: any;
    onEditorContextMenu: any;
    onEditorPaste: any;
}
declare const _default: React.ForwardRefExoticComponent<EditorProps & React.RefAttributes<unknown>>;
export default _default;
