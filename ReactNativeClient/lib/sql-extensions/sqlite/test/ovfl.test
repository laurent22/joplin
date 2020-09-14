# 2014 October 01
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
# focus of this file is testing the SQLITE_DIRECT_OVERFLOW_READ logic.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix ovfl

# Populate table t2:
#
#   CREATE TABLE t1(c1 TEXT, c2 TEXT);
#
# with 2000 rows. In each row, c2 spans multiple overflow pages. The text
# value of c1 ranges in size from 1 to 2000 bytes. The idea is to create
# at least one row where the first byte of c2 is also the first byte of
# an overflow page. This was at one point exposing an obscure bug in the
# SQLITE_DIRECT_OVERFLOW_READ logic.
#
do_test 1.1 {
  set c2 [string repeat abcdefghij 200]
  execsql {
    PRAGMA cache_size = 10;
    CREATE TABLE t1(c1 TEXT, c2 TEXT);
    BEGIN;
  }
  for {set i 1} {$i <= 2000} {incr i} {
    set c1 [string repeat . $i]
    execsql { INSERT INTO t1 VALUES($c1, $c2) }
  }
  execsql COMMIT
} {}

do_execsql_test 1.2 {
  SELECT sum(length(c2)) FROM t1;
} [expr 2000 * 2000]

finish_test
