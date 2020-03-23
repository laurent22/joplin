export function isCheckboxListItem(element) {
  return element.classList && element.classList.contains('joplin-checklist');
}

export function findContainerListTypeFromEvent(event) {
  if (isCheckboxListItem(event.element)) return 'joplinChecklist';

  for (const parent of event.parents) {
    if (isCheckboxListItem(parent)) return 'joplinChecklist';
  }

  return 'regular';
}

export function findContainerListTypeFromElement(element) {
  while (element) {
    if (element.nodeName === 'UL' || element.nodName === 'OL') {
      return isCheckboxListItem(element) ? 'joplinChecklist' : 'regular';
    }
    element = element.parentNode;
  }

  return 'regular';
}

export function addJoplinChecklistCommands(editor, ToggleList) {
  editor.addCommand('ToggleJoplinChecklistItem', function (ui, detail) {
    const element = detail.element;
    if (element.nodeName !== 'LI') return;
    const listType = findContainerListTypeFromElement(element);
    if (listType === 'joplinChecklist') {
      if (!element.classList || !element.classList.contains('checked')) {
        element.classList.add('checked');
      } else {
        element.classList.remove('checked');
      }
    }
  });

  editor.addCommand('InsertJoplinChecklist', function (ui, detail) {
    detail = Object.assign({}, detail, { listType: 'joplinChecklist' });
    ToggleList.toggleList(editor, 'UL', detail);
  });
}