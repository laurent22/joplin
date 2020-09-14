# 2009 January 1
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the part of the FTS3 expression
# parser that rebalances large expressions.
#
# $Id: fts3expr2.test,v 1.2 2009/06/05 17:09:12 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set ::testprefix fts3expr3

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

set sqlite_fts3_enable_parentheses 1

proc strip_phrase_data {L} {
  if {[lindex $L 0] eq "PHRASE"} {
    return [list P [lrange $L 3 end]]
  }
  return [list \
    [lindex $L 0] \
    [strip_phrase_data [lindex $L 1]] \
    [strip_phrase_data [lindex $L 2]] \
  ]
}
proc test_fts3expr2 {expr} {
  strip_phrase_data [
    db one {SELECT fts3_exprtest_rebalance('simple', $expr, 'a', 'b', 'c')}
  ]
}

proc balanced_exprtree_structure {nEntry} {
  set L [list]
  for {set i 1} {$i <= $nEntry} {incr i} {
    lappend L xxx
  }
  while {[llength $L] > 1} {
    set N [list]
    if {[llength $L] % 2} {
      foreach {a b} [lrange $L 0 end-1] { lappend N [list AND $a $b] }
      lappend N [lindex $L end]
    } else {
      foreach {a b} $L { lappend N [list AND $a $b] }
    }
    set L $N
  }
  return [lindex $L 0]
}

proc balanced_and_tree {nEntry} {
  set query [balanced_exprtree_structure $nEntry]
  if {$query == "xxx"} {
    return "P 1"
  }
  for {set i 1} {$i <= $nEntry} {incr i} {
    regsub xxx $query "{P $i}" query
  }
  return $query
}

proc random_tree_structure {nEntry bParen op} {
  set query xxx
  for {set i 1} {$i < $nEntry} {incr i} {
    set x1 [expr int(rand()*4.0)]
    set x2 [expr int(rand()*2.0)]
    if {$x1==0 && $bParen} {
      set query "($query)"
    }
    if {$x2} {
      set query "xxx $op $query"
    } else {
      set query "$query $op xxx"
    }
  }
  return $query
}

proc random_and_query {nEntry {bParen 0}} {
  set query [random_tree_structure $nEntry $bParen AND]
  for {set i 1} {$i <= $nEntry} {incr i} {
    regsub xxx $query $i query
  }
  return $query
}

proc random_or_query {nEntry} {
  set query [random_tree_structure $nEntry 1 OR]
  for {set i 1} {$i <= $nEntry} {incr i} {
    regsub xxx $query $i query
  }
  return $query
}

proc random_andor_query {nEntry} {
  set query [random_tree_structure $nEntry 1 AND]
  for {set i 1} {$i <= $nEntry} {incr i} {
    regsub xxx $query "([random_or_query $nEntry])" query
  }
  return $query
}

proc balanced_andor_tree {nEntry} {
  set tree [balanced_exprtree_structure $nEntry]
  set node "{[balanced_and_tree $nEntry]}"
  regsub -all AND $node OR node
  regsub -all xxx $tree $node tree
  return $tree
}

if 1 {

# Test that queries like "1 AND 2 AND 3 AND 4..." are transformed to 
# balanced trees by FTS.
#
for {set i 1} {$i < 100} {incr i} {
  do_test 1.$i {
    test_fts3expr2 [random_and_query $i]
  } [balanced_and_tree $i]
}

# Same again, except with parenthesis inserted at arbitrary points.
#
for {set i 1} {$i < 100} {incr i} {
  do_test 2.$i {
    test_fts3expr2 [random_and_query $i 1]
  } [balanced_and_tree $i]
}

# Now attempt to balance two AND trees joined by an OR.
#
for {set i 1} {$i < 100} {incr i} {
  do_test 3.$i {
    test_fts3expr2 "[random_and_query $i 1] OR [random_and_query $i 1]"
  } [list OR [balanced_and_tree $i] [balanced_and_tree $i]]
}

# Try trees of AND nodes with leaves that are themselves trees of OR nodes.
#
for {set i 2} {$i < 64} {incr i 4} {
  do_test 3.$i {
    test_fts3expr2 [random_andor_query $i]
  } [balanced_andor_tree $i]
}

# These exceed the depth limit. 
#
for {set i 65} {$i < 70} {incr i} {
  do_test 3.$i {
    list [catch {test_fts3expr2 [random_andor_query $i]} msg] $msg
  } {1 {Error parsing expression}}
}

# This also exceeds the depth limit. 
#

do_test 4.1.1 {
  set q "1"
  for {set i 2} {$i < 5000} {incr i} {
    append q " AND $i"
  }
  list [catch {test_fts3expr2 $q} msg] $msg
} {1 {Error parsing expression}}
do_test 4.1.2 {
  set q "1"
  for {set i 2} {$i < 4000} {incr i} {
    append q " AND $i"
  }
  catch {test_fts3expr2 $q}
} {0}

proc create_toggle_tree {nDepth} {
  if {$nDepth == 0} { return xxx }
  set nNew [expr $nDepth-1]
  if {$nDepth % 2} {
    return "([create_toggle_tree $nNew]) OR ([create_toggle_tree $nNew])"
  }
  return "([create_toggle_tree $nNew]) AND ([create_toggle_tree $nNew])"
}

do_test 4.2 {
  list [catch {test_fts3expr2 [create_toggle_tree 17]} msg] $msg
} {1 {Error parsing expression}}

set query [random_andor_query 12]
set result [balanced_andor_tree 12]
do_faultsim_test fts3expr3-fault-1 -faults oom-* -body {
  test_fts3expr2 $::query
} -test {
  faultsim_test_result [list 0 $::result]
}

}

#-------------------------------------------------------------------

foreach {tn expr res} {
  1 {1 OR 2 OR 3 OR 4}           {OR {OR {P 1} {P 2}} {OR {P 3} {P 4}}} 
  2 {1 OR (2 AND 3 AND 4 AND 5)} 
    {OR {P 1} {AND {AND {P 2} {P 3}} {AND {P 4} {P 5}}}}
  3 {(2 AND 3 AND 4 AND 5) OR 1} 
    {OR {AND {AND {P 2} {P 3}} {AND {P 4} {P 5}}} {P 1}}

  4 {1 AND (2 OR 3 OR 4 OR 5)} 
    {AND {P 1} {OR {OR {P 2} {P 3}} {OR {P 4} {P 5}}}}
  5 {(2 OR 3 OR 4 OR 5) AND 1} 
    {AND {OR {OR {P 2} {P 3}} {OR {P 4} {P 5}}} {P 1}}

  6 {(2 OR 3 OR 4 OR 5) NOT 1} 
    {NOT {OR {OR {P 2} {P 3}} {OR {P 4} {P 5}}} {P 1}}

  7 {1 NOT (2 OR 3 OR 4 OR 5)} 
    {NOT {P 1} {OR {OR {P 2} {P 3}} {OR {P 4} {P 5}}}}

  8 {(1 OR 2 OR 3 OR 4) NOT (5 AND 6 AND 7 AND 8)}
    {NOT {OR {OR {P 1} {P 2}} {OR {P 3} {P 4}}} {AND {AND {P 5} {P 6}} {AND {P 7} {P 8}}}}
} {
  do_test 5.1.$tn {
    test_fts3expr2 $expr
  } $res
}

set sqlite_fts3_enable_parentheses 0
finish_test
