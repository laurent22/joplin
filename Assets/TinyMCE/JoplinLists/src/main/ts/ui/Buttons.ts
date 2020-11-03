/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import Tools from 'tinymce/core/api/util/Tools';
import * as Settings from '../api/Settings';
import * as NodeType from '../core/NodeType';
import Editor from 'tinymce/core/api/Editor';
import { isCustomList } from '../core/Util';
import { findContainerListTypeFromEvent, isJoplinChecklistItem } from '../listModel/JoplinListUtil';

const findIndex = function (list, predicate) {
  for (let index = 0; index < list.length; index++) {
    const element = list[index];

    if (predicate(element)) {
      return index;
    }
  }
  return -1;
};

const listState = function (editor: Editor, listName, options:any = {}) {
  options = {
    listType: 'regular',
    ...options,
  };

  return function (buttonApi) {
    const nodeChangeHandler = (e) => {
      const tableCellIndex = findIndex(e.parents, NodeType.isTableCellNode);
      const parents = tableCellIndex !== -1 ? e.parents.slice(0, tableCellIndex) : e.parents;
      const lists = Tools.grep(parents, NodeType.isListNode);
      const listType = findContainerListTypeFromEvent(e);
      buttonApi.setActive(listType === options.listType && lists.length > 0 && lists[0].nodeName === listName && !isCustomList(lists[0]));
    };

    const editorClickHandler = (event) => {
      if (!isJoplinChecklistItem(event.target)) return;

      // We only process the click if it's within the checkbox itself (and not the label). 
      // That checkbox, based on
      // the current styling is in the negative margin, so offsetX is negative when clicking
      // on the checkbox itself, and positive when clicking on the label. This is strongly
      // dependent on how the checkbox is styled, so if the style is changed, this might need
      // to be updated too.
      // For the styling, see:
      // ReactNativeClient/lib/joplin-renderer/MdToHtml/rules/checkbox.ts
      //
      // The previous solution was to use "pointer-event: none", which mostly work, however
      // it means that links are no longer clickable when they are within the checkbox label.
      if (event.offsetX >= 0) return;

      editor.execCommand('ToggleJoplinChecklistItem', false, { element: event.target });
    }

    if (options.listType === 'joplinChecklist') {
      editor.on('click', editorClickHandler);
    }

    editor.on('NodeChange', nodeChangeHandler);

    return () => {
      if (options.listType === 'joplinChecklist') {
        editor.off('click', editorClickHandler);
      }
      editor.off('NodeChange', nodeChangeHandler);
    } 
  };
};

const register = function (editor: Editor) {
  const hasPlugin = function (editor, plugin) {
    const plugins = editor.settings.plugins ? editor.settings.plugins : '';
    return Tools.inArray(plugins.split(/[ ,]/), plugin) !== -1;
  };

  const _ = Settings.getLocalizationFunction(editor);
  const exec = (command) => () => editor.execCommand(command);

  if (!hasPlugin(editor, 'advlist')) {
    editor.ui.registry.addToggleButton('numlist', {
      icon: 'ordered-list',
      active: false,
      tooltip: 'Numbered list',
      onAction: exec('InsertOrderedList'),
      onSetup: listState(editor, 'OL')
    });

    editor.ui.registry.addToggleButton('bullist', {
      icon: 'unordered-list',
      active: false,
      tooltip: 'Bullet list',
      onAction: exec('InsertUnorderedList'),
      onSetup: listState(editor, 'UL')
    });

    editor.ui.registry.addToggleButton('joplinChecklist', {
      icon: 'checklist',
      active: false,
      tooltip: _('Checkbox list'),
      onAction: exec('InsertJoplinChecklist'),
      onSetup: listState(editor, 'UL', { listType: 'joplinChecklist' })
    });
  }
};

export {
  register
};
