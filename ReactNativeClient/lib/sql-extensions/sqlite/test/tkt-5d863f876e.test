# 2011 January 15
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
# This file implements tests to verify that ticket [5d863f876e] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
set ::testprefix tkt-5d863f876e
if {![wal_is_capable]} {finish_test ; return }

do_multiclient_test tn {
  do_test $tn.1 {
    sql1 {
      CREATE TABLE t1(a, b);
      CREATE INDEX i1 ON t1(a, b);
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t1 VALUES(3, 4);
      PRAGMA journal_mode = WAL;
      VACUUM;
      PRAGMA journal_mode = DELETE;
    }
  } {wal delete}

  do_test $tn.2 {
    sql2 { SELECT * FROM t1 } 
  } {1 2 3 4}

  do_test $tn.3 {
    sql1 {
      INSERT INTO t1 VALUES(5, 6);
      PRAGMA journal_mode = WAL;
      VACUUM;
      PRAGMA journal_mode = DELETE;
    }
  } {wal delete}

  do_test $tn.2 {
    sql2 { PRAGMA integrity_check }
  } {ok}
}


finish_test
