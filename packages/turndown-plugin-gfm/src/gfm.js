import highlightedCodeBlock from './highlighted-code-block'
import strikethrough from './strikethrough'
import tables from './tables'
import taskListItems from './task-list-items'

function gfm (turndownService) {
  turndownService.use([
    highlightedCodeBlock,
    strikethrough,
    tables,
    taskListItems
  ])
}

export { gfm, highlightedCodeBlock, strikethrough, tables, taskListItems }
