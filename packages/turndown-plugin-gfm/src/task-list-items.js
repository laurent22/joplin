export default function taskListItems (turndownService) {
  turndownService.addRule('taskListItems', {
    filter: function (node) {
      const parent = node.parentNode;
      const grandparent = parent.parentNode;
      const grandparentIsListItem = !!grandparent && grandparent.nodeName === 'LI';
      return (node.type === 'checkbox' || node.role === 'checkbox') && (
        parent.nodeName === 'LI'
        // Handles the case where the label contains the checkbox. For example,
        // <label><input ...> ...label text...</label>
        || (parent.nodeName === 'LABEL' && grandparentIsListItem)
        // Handles the case where the input is contained within a <span>
        // <li><span><input ...></span></li>
        || (parent.nodeName === 'SPAN' && grandparentIsListItem)
      )
    },
    replacement: function (content, node) {
      const checked = node.nodeName === 'INPUT' ? node.checked : node.getAttribute('aria-checked') === 'true';
      return (checked ? '[x]' : '[ ]') + ' '
    }
  })
}
