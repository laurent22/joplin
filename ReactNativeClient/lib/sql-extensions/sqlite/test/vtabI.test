# 2015 Nov 26
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests the sqlite3_index_info.colUsed variable is set correctly.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix vtabI

ifcapable !vtab {
  finish_test
  return
}

register_echo_module db

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b, c, d, e);
  CREATE VIRTUAL TABLE e1 USING echo(t1);
}

foreach {tn query filter} {
  1 {SELECT * FROM e1} 
    {SELECT rowid, a, b, c, d, e FROM 't1'}

  2 {SELECT a, b FROM e1} 
    {SELECT rowid, a, b, NULL, NULL, NULL FROM 't1'}

  3 {SELECT count(*) FROM e1 GROUP BY b} 
    {SELECT rowid, NULL, b, NULL, NULL, NULL FROM 't1'}

  4 {SELECT count(*) FROM e1 GROUP BY b HAVING a=?} 
    {SELECT rowid, a, b, NULL, NULL, NULL FROM 't1'}

  5 {SELECT a FROM e1 WHERE c=?}
    {SELECT rowid, a, NULL, c, NULL, NULL FROM 't1'}

  6 {SELECT a FROM e1 ORDER BY e}
    {SELECT rowid, a, NULL, NULL, NULL, e FROM 't1'}

  7 {SELECT a FROM e1 ORDER BY e, d}
    {SELECT rowid, a, NULL, NULL, d, e FROM 't1'}
} {
  do_test 1.$tn {
    set ::echo_module [list]
    execsql $query
    set idx [lsearch -exact $::echo_module xFilter]
    lindex $::echo_module [expr $idx+1]
  } $filter
}

#-------------------------------------------------------------------------
# Tests with a table with more than 64 columns.
#
proc all_col_list {} {
  set L [list]
  for {set i 1} {$i <= 100} {incr i} { lappend L "c$i" }
  set L
}

proc part_col_list {cols} {
  set L [list]
  for {set i 1} {$i <= 100} {incr i} { 
    set c "c$i"
    if {[lsearch $cols $c]>=0} {
      lappend L "c$i" 
    } else {
      lappend L NULL
    }
  }
  set L
}
proc CL {args} {
  join [part_col_list $args] ", "
}
proc CLT {args} {
  set cols $args
  for {set i 64} {$i <= 100} {incr i} {
    lappend cols "c$i"
  }
  join [part_col_list $cols] ", "
}

do_test 2.0 {
  execsql "CREATE TABLE t2([join [all_col_list] ,])"
  execsql "CREATE VIRTUAL TABLE e2 USING echo(t2)"
} {}

foreach {tn query filter} {
  1 {SELECT c1, c10, c20 FROM e2} 
    {SELECT rowid, [CL c1 c10 c20] FROM 't2'}

  2 {SELECT c40, c50, c60 FROM e2} 
    {SELECT rowid, [CL c40 c50 c60] FROM 't2'}

  3 {SELECT c7, c80, c90 FROM e2} 
    {SELECT rowid, [CLT c7] FROM 't2'}

  4 {SELECT c64 FROM e2} 
    {SELECT rowid, [CLT c64] FROM 't2'}

  5 {SELECT c63 FROM e2} 
    {SELECT rowid, [CL c63] FROM 't2'}

  6 {SELECT c22 FROM e2 ORDER BY c50, c70} 
    {SELECT rowid, [CLT c22 c50] FROM 't2'}

} {
  do_test 2.$tn {
    set ::echo_module [list]
    execsql $query
    set idx [lsearch -exact $::echo_module xFilter]
    lindex $::echo_module [expr $idx+1]
  } [subst $filter]
}

finish_test
