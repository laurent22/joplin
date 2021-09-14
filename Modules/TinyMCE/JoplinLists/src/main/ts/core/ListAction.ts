export const enum ListAction {
  ToggleUlList = 'ToggleUlList',
  ToggleOlList = 'ToggleOlList',
  ToggleDLList = 'ToggleDLList',
  IndentList = 'IndentList',
  OutdentList = 'OutdentList'
}

export const listToggleActionFromListName = (listName: 'UL' | 'OL' | 'DL'): ListAction => {
  switch (listName) {
    case 'UL': return ListAction.ToggleUlList;
    case 'OL': return ListAction.ToggleOlList;
    case 'DL': return ListAction.ToggleDLList;
  }
};
