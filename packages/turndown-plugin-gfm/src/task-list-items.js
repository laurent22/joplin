export default function taskListItems (turndownService) {
  turndownService.addRule('taskListItems', {
    filter: function (node) {
      const parent = node.parentNode;
      const grandparent = parent.parentNode;
      return node.type === 'checkbox' && (
        parent.nodeName === 'LI'
        // Handles the case where the label contains the checkbox. For example,
        // <label><input ...> ...label text...</label>
        || (parent.nodeName === 'LABEL' && grandparent && grandparent.nodeName === 'LI')
      )
    },
    replacement: function (content, node) {
      return (node.checked ? '[x]' : '[ ]') + ' '
    }
  })
}
