# 2008 Feb 19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file contains Tcl code that may be useful for testing or
# analyzing r-tree structures created with this module. It is
# used by both test procedures and the r-tree viewer application.
#


#--------------------------------------------------------------------------
# PUBLIC API:
#
#   rtree_depth
#   rtree_ndim
#   rtree_node
#   rtree_mincells
#   rtree_check
#   rtree_dump
#   rtree_treedump
#

proc rtree_depth {db zTab} {
  $db one "SELECT rtreedepth(data) FROM ${zTab}_node WHERE nodeno=1"
}

proc rtree_nodedepth {db zTab iNode} {
  set iDepth [rtree_depth $db $zTab]
  
  set ii $iNode
  while {$ii != 1} {
    set sql "SELECT parentnode FROM ${zTab}_parent WHERE nodeno = $ii"
    set ii [db one $sql]
    incr iDepth -1
  }
  
  return $iDepth
}

# Return the number of dimensions of the rtree.
#
proc rtree_ndim {db zTab} {
  set nDim [expr {(([llength [$db eval "pragma table_info($zTab)"]]/6)-1)/2}]
}

# Return the contents of rtree node $iNode.
#
proc rtree_node {db zTab iNode {iPrec 6}} {
  set nDim [rtree_ndim $db $zTab]
  set sql "
    SELECT rtreenode($nDim, data) FROM ${zTab}_node WHERE nodeno = $iNode
  "
  set node [db one $sql]

  set nCell [llength $node]
  set nCoord [expr $nDim*2]
  for {set ii 0} {$ii < $nCell} {incr ii} {
    for {set jj 1} {$jj <= $nCoord} {incr jj} {
      set newval [format "%.${iPrec}f" [lindex $node $ii $jj]]
      lset node $ii $jj $newval
    }
  }
  set node
}

proc rtree_mincells {db zTab} {
  set n [$db one "select length(data) FROM ${zTab}_node LIMIT 1"]
  set nMax [expr {int(($n-4)/(8+[rtree_ndim $db $zTab]*2*4))}]
  return [expr {int($nMax/3)}]
}

# An integrity check for the rtree $zTab accessible via database 
# connection $db.
#
proc rtree_check {db zTab} {
  array unset ::checked
 
  # Check each r-tree node.
  set rc [catch {
    rtree_node_check $db $zTab 1 [rtree_depth $db $zTab]
  } msg]
  if {$rc && $msg ne ""} { error $msg }

  # Check that the _rowid and _parent tables have the right 
  # number of entries.
  set nNode   [$db one "SELECT count(*) FROM ${zTab}_node"]
  set nRow    [$db one "SELECT count(*) FROM ${zTab}"]
  set nRowid  [$db one "SELECT count(*) FROM ${zTab}_rowid"]
  set nParent [$db one "SELECT count(*) FROM ${zTab}_parent"]

  if {$nNode != ($nParent+1)} { 
    error "Wrong number of entries in ${zTab}_parent"
  }
  if {$nRow != $nRowid} { 
    error "Wrong number of entries in ${zTab}_rowid"
  }
  
  return $rc
}

proc rtree_node_check {db zTab iNode iDepth} {
  if {[info exists ::checked($iNode)]} { error "Second ref to $iNode" }
  set ::checked($iNode) 1

  set node [rtree_node $db $zTab $iNode]
  if {$iNode!=1 && [llength $node]==0} { error "No such node: $iNode" }

  if {$iNode != 1 && [llength $node]<[rtree_mincells $db $zTab]} {
    puts "Node $iNode: Has only [llength $node] cells"
    error ""
  }
  if {$iNode == 1 && [llength $node]==1 && [rtree_depth $db $zTab]>0} {
    set depth [rtree_depth $db $zTab]
    puts "Node $iNode: Has only 1 child (tree depth is $depth)"
    error ""
  }

  set nDim [expr {([llength [lindex $node 0]]-1)/2}]

  if {$iDepth > 0} {
    set d [expr $iDepth-1]
    foreach cell $node {
      set shouldbe [rtree_node_check $db $zTab [lindex $cell 0] $d]
      if {$cell ne $shouldbe} {
        puts "Node $iNode: Cell is: {$cell}, should be {$shouldbe}"
        error ""
      }
    }
  }

  set mapping_table "${zTab}_parent" 
  set mapping_sql "SELECT parentnode FROM $mapping_table WHERE rowid = \$rowid"
  if {$iDepth==0} { 
    set mapping_table "${zTab}_rowid"
    set mapping_sql "SELECT nodeno FROM $mapping_table WHERE rowid = \$rowid"
  }
  foreach cell $node {
    set rowid [lindex $cell 0]
    set mapping [db one $mapping_sql]
    if {$mapping != $iNode} {
      puts "Node $iNode: $mapping_table entry for cell $rowid is $mapping"
      error ""
    }
  }

  set ret [list $iNode]
  for {set ii 1} {$ii <= $nDim*2} {incr ii} {
    set f [lindex $node 0 $ii]
    foreach cell $node {
      set f2 [lindex $cell $ii]
      if {($ii%2)==1 && $f2<$f} {set f $f2}
      if {($ii%2)==0 && $f2>$f} {set f $f2}
    }
    lappend ret $f
  }
  return $ret
}

proc rtree_dump {db zTab} {
  set zRet ""
  set nDim [expr {(([llength [$db eval "pragma table_info($zTab)"]]/6)-1)/2}]
  set sql "SELECT nodeno, rtreenode($nDim, data) AS node FROM ${zTab}_node"
  $db eval $sql {
    append zRet [format "% -10s %s\n" $nodeno $node]
  }
  set zRet
}

proc rtree_nodetreedump {db zTab zIndent iDepth iNode} {
  set ret ""
  set node [rtree_node $db $zTab $iNode 1]
  append ret [format "%-3d %s%s\n" $iNode $zIndent $node]
  if {$iDepth>0} {
    foreach cell $node {
      set i [lindex $cell 0]
      append ret [rtree_nodetreedump $db $zTab "$zIndent  " [expr $iDepth-1] $i]
    }
  }
  set ret
}

proc rtree_treedump {db zTab} {
  set d [rtree_depth $db $zTab]
  rtree_nodetreedump $db $zTab "" $d 1
}

proc do_rtree_integrity_test {tn tbl} {
  uplevel [list do_execsql_test $tn "SELECT rtreecheck('$tbl')" ok]
}

