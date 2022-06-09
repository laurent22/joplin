/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import * as ToggleList from '../actions/ToggleList';
import { indentListSelection, outdentListSelection, flattenListSelection } from '../actions/Indendation';
import { addJoplinChecklistCommands, isJoplinChecklistItem } from '../listModel/JoplinListUtil';


const queryListCommandState = function (editor, listName) {
  return function () {
    const parentList = editor.dom.getParent(editor.selection.getStart(), 'UL,OL,DL');
    return parentList && parentList.nodeName === listName;
  };
};

const register = function (editor) {
  editor.on('BeforeExecCommand', function (e) {
    const cmd = e.command.toLowerCase();

    if (cmd === 'indent') {
      indentListSelection(editor);
    } else if (cmd === 'outdent') {
      outdentListSelection(editor);
    }
  });

  editor.addCommand('InsertUnorderedList', function (ui, detail) {
    ToggleList.toggleList(editor, 'UL', detail);
  });

  editor.addCommand('InsertOrderedList', function (ui, detail) {
    ToggleList.toggleList(editor, 'OL', detail);
  });

  editor.addCommand('InsertDefinitionList', function (ui, detail) {
    ToggleList.toggleList(editor, 'DL', detail);
  });

  editor.addCommand('RemoveList', () => {
    flattenListSelection(editor);
  });

  editor.addQueryStateHandler('InsertUnorderedList', queryListCommandState(editor, 'UL'));
  editor.addQueryStateHandler('InsertOrderedList', queryListCommandState(editor, 'OL'));
  editor.addQueryStateHandler('InsertDefinitionList', queryListCommandState(editor, 'DL'));

  addJoplinChecklistCommands(editor, ToggleList);

  const editorClickHandler = (event) => {
    if (!isJoplinChecklistItem(event.target)) return;

    // We only process the click if it's within the checkbox itself (and not the label).
    // That checkbox, based on
    // the current styling is in the negative margin, so offsetX is negative when clicking
    // on the checkbox itself, and positive when clicking on the label. This is strongly
    // dependent on how the checkbox is styled, so if the style is changed, this might need
    // to be updated too.
    // For the styling, see:
    // packages/renderer/MdToHtml/rules/checkbox.ts
    //
    // The previous solution was to use "pointer-event: none", which mostly work, however
    // it means that links are no longer clickable when they are within the checkbox label.
    if (event.offsetX >= 0) return;

    editor.execCommand('ToggleJoplinChecklistItem', false, { element: event.target });
  }
  editor.on('click', editorClickHandler);
};

export {
  register
};
