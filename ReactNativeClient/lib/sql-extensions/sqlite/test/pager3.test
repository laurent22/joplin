# 2010 June 15
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl
source $testdir/wal_common.tcl

if {[atomic_batch_write test.db]} {
  finish_test
  return
}

foreach {tn sql res j} {
  1 "PRAGMA journal_mode = DELETE"  delete        0
  2 "CREATE TABLE t1(a, b)"         {}            0
  3 "PRAGMA locking_mode=EXCLUSIVE" {exclusive}   0
  4 "INSERT INTO t1 VALUES(1, 2)"   {}            1
  5 "PRAGMA locking_mode=NORMAL"    {normal}      1
  6 "SELECT * FROM t1"              {1 2}         0
} {
  do_execsql_test pager3-1.$tn.1 $sql $res
  do_test         pager3-1.$tn.2 { file exists test.db-journal } $j
}


finish_test
