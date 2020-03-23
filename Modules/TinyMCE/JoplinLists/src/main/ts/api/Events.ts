import Editor from 'tinymce/core/api/Editor';
import { ListAction } from '../core/ListAction';

export const fireListEvent = (editor: Editor, action: ListAction, element) => editor.fire('ListMutation', { action, element });
