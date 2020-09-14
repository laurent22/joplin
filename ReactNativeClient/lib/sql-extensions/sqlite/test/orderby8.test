# 2015-01-19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing ORDER BY and LIMIT on tables with
# many columns.
#
# These tests verify that ticket [f97c4637102a3ae72b7911167e1d4da12ce60722]
# from 2015-01-19 has been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix orderby8

do_test 1.0 {
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES(1),(5),(9),(7),(3),(2),(4),(6),(8);
  }
  set ::result_set "x"
} {x}
for {set i 1} {$i<200} {incr i} {
  append ::result_set ", x+$i"
  do_test 1.$i {
    set res {}
    db eval "SELECT $::result_set FROM t1 ORDER BY x LIMIT -1" {
      lappend res $x
    }
    set res
  } {1 2 3 4 5 6 7 8 9}
}

finish_test
