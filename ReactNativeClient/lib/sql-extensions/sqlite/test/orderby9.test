# 2015-08-26
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
# 
# This file seeks to verify that expressions (and especially functions)
# that are in both the ORDER BY clause and the result set are only
# evaluated once.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix orderby9


do_execsql_test setup {
  -- create a table with many entries
  CREATE TABLE t1(x);
  WITH RECURSIVE
     c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<100)
  INSERT INTO t1 SELECT x FROM c;
}

# Some versions of TCL are unable to [lsort -int] for
# 64-bit integers.  So we write our own comparison
# routine.
proc bigintcompare {a b} {
  set x [expr {$a-$b}]
  if {$x<0} {return -1}
  if {$x>0} {return +1}
  return 0
}
do_test 1.0 {
  set l1 {}
  # If random() is only evaluated once and then reused for each row, then
  # the output should appear in sorted order.  If random() is evaluated 
  # separately for the result set and the ORDER BY clause, then the output
  # order will be random.
  db eval {SELECT random() AS y FROM t1 ORDER BY 1;} {lappend l1 $y}
  expr {$l1==[lsort -command bigintcompare $l1]}
} {1}

do_test 1.1 {
  set l1 {}
  db eval {SELECT random() AS y FROM t1 ORDER BY random();} {lappend l1 $y}
  expr {$l1==[lsort -command bigintcompare $l1]}
} {1}

do_test 1.2 {
  set l1 {}
  db eval {SELECT random() AS y FROM t1 ORDER BY +random();} {lappend l1 $y}
  expr {$l1==[lsort -command bigintcompare $l1]}
} {0}

finish_test
