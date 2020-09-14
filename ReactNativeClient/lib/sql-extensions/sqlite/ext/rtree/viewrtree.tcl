
load ./libsqlite3.dylib
#package require sqlite3
source [file join [file dirname $argv0] rtree_util.tcl]

wm title . "SQLite r-tree viewer"

if {[llength $argv]!=1} {
  puts stderr "Usage: $argv0 <database-file>"
  puts stderr ""
  exit
}
sqlite3 db [lindex $argv 0]

canvas .c -background white -width 400 -height 300 -highlightthickness 0

button .b -text "Parent Node" -command {
  set sql "SELECT parentnode FROM $::O(zTab)_parent WHERE nodeno = $::O(iNode)"
  set ::O(iNode) [db one $sql]
  if {$::O(iNode) eq ""} {set ::O(iNode) 1}
  view_node
}

set O(iNode) 1
set O(zTab) ""
set O(listbox_captions)  [list]
set O(listbox_itemmap)   [list]
set O(listbox_highlight) -1

listbox   .l -listvariable ::O(listbox_captions) -yscrollcommand {.ls set}
scrollbar .ls -command {.l yview}
label     .status -font courier -anchor w
label     .title -anchor w -text "Node 1:" -background white -borderwidth 0


set rtree_tables [list]
db eval {
  SELECT name 
  FROM sqlite_master 
  WHERE type='table' AND sql LIKE '%virtual%table%using%rtree%'
} {
  set nCol [expr [llength [db eval "pragma table_info($name)"]]/6]
  if {$nCol != 5} {
    puts stderr "Not viewing $name - is not 2-dimensional"
  } else {
    lappend rtree_tables [list Table $name]
  }
}
if {$rtree_tables eq ""} {
  puts stderr "Cannot find an r-tree table in database [lindex $argv 0]"
  puts stderr ""
  exit
}
eval tk_optionMenu .select option_var $rtree_tables
trace add variable option_var write set_option_var
proc set_option_var {args} {
  set ::O(zTab) [lindex $::option_var 1]
  set ::O(iNode) 1
  view_node
}
set ::O(zTab) [lindex $::rtree_tables 0 1]

bind .l <1> {listbox_click [.l nearest %y]}
bind .l <Motion> {listbox_mouseover [.l nearest %y]}
bind .l <Leave>  {listbox_mouseover -1}

proc listbox_click {sel} {
  if {$sel ne ""} {
    set ::O(iNode) [lindex $::O(listbox_captions) $sel 1]
    view_node
  }
}
proc listbox_mouseover {i} {
  set oldid [lindex $::O(listbox_itemmap) $::O(listbox_highlight)]
  .c itemconfigure $oldid -fill ""

  .l selection clear 0 end
  .status configure -text ""
  if {$i>=0} {
    set id [lindex $::O(listbox_itemmap) $i]
    .c itemconfigure $id -fill grey
    .c lower $id
    set ::O(listbox_highlight) $i
    .l selection set $i
    .status configure -text [cell_report db $::O(zTab) $::O(iNode) $i]
  }
}

grid configure .select  -row 0 -column 0 -columnspan 2 -sticky nsew
grid configure .b       -row 1 -column 0 -columnspan 2 -sticky nsew
grid configure .l       -row 2 -column 0               -sticky nsew
grid configure .status  -row 3 -column 0 -columnspan 3 -sticky nsew

grid configure .title   -row 0 -column 2               -sticky nsew
grid configure .c       -row 1 -column 2 -rowspan 2    -sticky nsew
grid configure .ls      -row 2 -column 1               -sticky nsew

grid columnconfigure . 2 -weight 1
grid rowconfigure    . 2 -weight 1

proc node_bbox {data} {
  set xmin 0
  set xmax 0
  set ymin 0
  set ymax 0
  foreach {rowid xmin xmax ymin ymax} [lindex $data 0] break
  foreach cell [lrange $data 1 end] {
    foreach {rowid x1 x2 y1 y2} $cell break
    if {$x1 < $xmin} {set xmin $x1}
    if {$x2 > $xmax} {set xmax $x2}
    if {$y1 < $ymin} {set ymin $y1}
    if {$y2 > $ymax} {set ymax $y2}
  }
  list $xmin $xmax $ymin $ymax
}

proc view_node {} {
  set iNode $::O(iNode)
  set zTab $::O(zTab)

  set data [rtree_node db $zTab $iNode 12]
  set depth [rtree_nodedepth db $zTab $iNode]

  .c delete all
  set ::O(listbox_captions) [list]
  set ::O(listbox_itemmap) [list]
  set $::O(listbox_highlight) -1

  .b configure -state normal
  if {$iNode == 1} {.b configure -state disabled}
  .title configure -text "Node $iNode: [cell_report db $zTab $iNode -1]"

  foreach {xmin xmax ymin ymax} [node_bbox $data] break
  set total_area 0.0

  set xscale [expr {double([winfo width .c]-20)/($xmax-$xmin)}]
  set yscale [expr {double([winfo height .c]-20)/($ymax-$ymin)}]

  set xoff [expr {10.0 - $xmin*$xscale}]
  set yoff [expr {10.0 - $ymin*$yscale}]

  foreach cell $data {
    foreach {rowid x1 x2 y1 y2} $cell break
    set total_area [expr {$total_area + ($x2-$x1)*($y2-$y1)}]
    set x1 [expr {$x1*$xscale + $xoff}]
    set x2 [expr {$x2*$xscale + $xoff}]
    set y1 [expr {$y1*$yscale + $yoff}]
    set y2 [expr {$y2*$yscale + $yoff}]

    set id [.c create rectangle $x1 $y1 $x2 $y2]
    if {$depth>0} {
      lappend ::O(listbox_captions) "Node $rowid"
      lappend ::O(listbox_itemmap) $id
    }
  }
}

proc cell_report {db zTab iParent iCell} {
  set data [rtree_node db $zTab $iParent 12]
  set cell [lindex $data $iCell]

  foreach {xmin xmax ymin ymax} [node_bbox $data] break
  set total_area [expr ($xmax-$xmin)*($ymax-$ymin)]

  if {$cell eq ""} {
    set cell_area 0.0
    foreach cell $data {
      foreach {rowid x1 x2 y1 y2} $cell break
      set cell_area [expr $cell_area+($x2-$x1)*($y2-$y1)]
    }
    set cell_area [expr $cell_area/[llength $data]]
    set zReport [format "Size = %.1f x %.1f    Average child area = %.1f%%" \
      [expr $xmax-$xmin] [expr $ymax-$ymin] [expr 100.0*$cell_area/$total_area]\
    ]
    append zReport "   Sub-tree height: [rtree_nodedepth db $zTab $iParent]"
  } else {
    foreach {rowid x1 x2 y1 y2} $cell break
    set cell_area  [expr ($x2-$x1)*($y2-$y1)]
    set zReport [format "Size = %.1f x %.1f    Area = %.1f%%" \
      [expr $x2-$x1] [expr $y2-$y1] [expr 100.0*$cell_area/$total_area]
    ]
  }

  return $zReport
}

view_node
bind .c <Configure> view_node
