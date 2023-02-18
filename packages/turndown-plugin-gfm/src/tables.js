var indexOf = Array.prototype.indexOf;
var every = Array.prototype.every;
var rules = {};
var alignMap = { left: ":---", right: "---:", center: ":---:" };

function getAlignment(node) {
  return node
    ? (node.getAttribute("align") || node.style.textAlign || "").toLowerCase()
    : "";
}

function getBorder(alignment) {
  return alignment ? alignMap[alignment] : "---";
}

function getColumnAlignment(table, columnIndex) {
  var votes = {
    left: 0,
    right: 0,
    center: 0,
    "": 0,
  };

  var align = "";

  for (var i = 0; i < table.rows.length; ++i) {
    var row = tables.rows[i];
    if (columnIndex < row.childNodes.length) {
      var cellAlignment = getAlignment(row.childNodes[columnIndex]);
      ++votes[cellAlignment];

      if (votes[cellAlignment] > votes[align]) {
        align = cellAlignment;
      }
    }
  }

  return align;
}

rules.tableCell = {
  filter: ["th", "td"],
  replacement: function (content, node) {
    if (tableShouldBeSkipped(nodeParentTable(node))) return content;
    return cell(content, node);
  },
};

rules.tableRow = {
  filter: "tr",
  replacement: function (content, node) {
    const parentTable = nodeParentTable(node);
    if (tableShouldBeSkipped(parentTable)) return content;

    var borderCells = "";

    if (isHeadingRow(node)) {
      const colCount = tableColCount(parentTable);
      for (var i = 0; i < colCount; i++) {
        const childNode =
          i < node.childNodes.length ? node.childNodes[i] : null;
        var border = getBorder(getAlignment(childNode));

        if (childNode) {
          borderCells += cell(border, node.childNodes[i]);
        } else {
          borderCells += cell(border, null, i);
        }
      }
    }
    return "\n" + content + (borderCells ? "\n" + borderCells : "");
  },
};

rules.table = {
  // Only convert tables with a heading row.
  // Tables with no heading row are kept using `keep` (see below).
  filter: function (node) {
    return node.nodeName === "TABLE";
  },

  replacement: function (content, node) {
    if (tableShouldBeSkipped(node)) return content;

    // Ensure there are no blank lines
    content = content.replace(/\n+/g, "\n");

    // If table has no heading, add an empty one so as to get a valid Markdown table
    var secondLine = content.trim().split("\n");
    if (secondLine.length >= 2) secondLine = secondLine[1];
    var secondLineIsDivider = /\| :?---/.test(secondLine);

    var columnCount = tableColCount(node);
    var emptyHeader = "";
    if (columnCount && !secondLineIsDivider) {
      emptyHeader = "|" + "     |".repeat(columnCount) + "\n" + "|";
      for (var columnIndex = 0; columnIndex < columnCount; ++columnIndex) {
        emptyHeader +=
          " " + getBorder(getColumnAlignment(node, columnIndex)) + " |";
      }
    }

    return "\n\n" + emptyHeader + content + "\n\n";
  },
};

rules.tableSection = {
  filter: ["thead", "tbody", "tfoot"],
  replacement: function (content) {
    return content;
  },
};

// A tr is a heading row if:
// - the parent is a THEAD
// - or if its the first child of the TABLE or the first TBODY (possibly
//   following a blank THEAD)
// - and every cell is a TH
function isHeadingRow(tr) {
  var parentNode = tr.parentNode;
  return (
    parentNode.nodeName === "THEAD" ||
    (parentNode.firstChild === tr &&
      (parentNode.nodeName === "TABLE" || isFirstTbody(parentNode)) &&
      every.call(tr.childNodes, function (n) {
        return n.nodeName === "TH";
      }))
  );
}

function isFirstTbody(element) {
  var previousSibling = element.previousSibling;
  return (
    element.nodeName === "TBODY" &&
    (!previousSibling ||
      (previousSibling.nodeName === "THEAD" &&
        /^\s*$/i.test(previousSibling.textContent)))
  );
}

function cell(content, node = null, index = null) {
  if (index === null) index = indexOf.call(node.parentNode.childNodes, node);
  var prefix = " ";
  if (index === 0) prefix = "| ";
  let filteredContent = content
    .trim()
    .replace(/\n\r/g, "<br>")
    .replace(/\n/g, "<br>");
  filteredContent = filteredContent.replace(/\|+/g, "\\|");
  while (filteredContent.length < 3) filteredContent += " ";
  if (node) filteredContent = handleColSpan(filteredContent, node, " ");
  return prefix + filteredContent + " |";
}

function nodeContainsTable(node) {
  if (!node.childNodes) return false;

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeName === "TABLE") return true;
    if (nodeContainsTable(child)) return true;
  }
  return false;
}

// Various conditions under which a table should be skipped - i.e. each cell
// will be rendered one after the other as if they were paragraphs.
function tableShouldBeSkipped(tableNode) {
  if (!tableNode) return true;
  if (!tableNode.rows) return true;
  if (tableNode.rows.length === 1 && tableNode.rows[0].childNodes.length <= 1)
    return true; // Table with only one cell
  if (nodeContainsTable(tableNode)) return true;
  return false;
}

function nodeParentTable(node) {
  let parent = node.parentNode;
  while (parent.nodeName !== "TABLE") {
    parent = parent.parentNode;
    if (!parent) return null;
  }
  return parent;
}

function handleColSpan(content, node, emptyChar) {
  const colspan = node.getAttribute("colspan") || 1;
  for (let i = 1; i < colspan; i++) {
    content += " | " + emptyChar.repeat(3);
  }
  return content;
}

function tableColCount(node) {
  let maxColCount = 0;
  for (let i = 0; i < node.rows.length; i++) {
    const row = node.rows[i];
    const colCount = row.childNodes.length;
    if (colCount > maxColCount) maxColCount = colCount;
  }
  return maxColCount;
}

export default function tables(turndownService) {
  turndownService.keep(function (node) {
    return node.nodeName === "TABLE";
  });
  for (var key in rules) turndownService.addRule(key, rules[key]);
}
