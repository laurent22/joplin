
# 2015-05-28
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
# focus of this file is testing locks on read-only WAL-mode databases.

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
set testprefix rowallock

set mmap_res 1000000
ifcapable !mmap {
  set mmap_res 0
}

do_multiclient_test tn {
  code2 { db2 close }
  code3 { db3 close }
  
  do_execsql_test 1.$tn.1 {
    PRAGMA page_size = 4096;
    CREATE TABLE t1(a, b);
    CREATE TABLE t2(a, b);
    INSERT INTO t1 VALUES(1, 2), (3, 4);
    PRAGMA journal_mode = wal;
  } {wal}

  code1 { 
    db close 
    sqlite3 db test.db -readonly 1
  }

  do_execsql_test 1.$tn.2 {
    PRAGMA mmap_size = 1000000;
  } $mmap_res
  do_execsql_test 1.$tn.2.1 {
    SELECT * FROM t1;
  } {1 2 3 4}

  do_catchsql_test 1.$tn.3 {
    INSERT INTO t1 VALUES(5, 6);
  } {1 {attempt to write a readonly database}}

  do_test 1.$tn.4 {
    code2 { sqlite3 db2 test.db }
    sql2 { INSERT INTO t1 VALUES(5, 6); }
    code2 { db2 close }
    file exists test.db-wal
  } {1}

  do_test 1.$tn.5 {
    sql1 { SELECT * FROM t2 }
    code1 { db close }
    file exists test.db-wal
  } {1}
}

finish_test
