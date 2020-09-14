# 2015-11-07
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
# focus of this file is testing the WITH clause.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix atomic

db close
if {[atomic_batch_write test.db]==0} {
  puts "No f2fs atomic-batch-write support. Skipping tests..."
  finish_test
  return
}

reset_db

do_execsql_test 1.0 {
  CREATE TABLE t1(x, y);
  BEGIN;
    INSERT INTO t1 VALUES(1, 2);
}

do_test 1.1 { file exists test.db-journal } {0}

do_execsql_test 1.2 {
  COMMIT;
}


finish_test
