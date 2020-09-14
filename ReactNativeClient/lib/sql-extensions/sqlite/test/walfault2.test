# 2010 May 03
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
# focus of this file is testing the operation of the library in
# "PRAGMA journal_mode=WAL" mode.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
source $testdir/lock_common.tcl

ifcapable !wal {finish_test ; return }
set testprefix walfault2

#-------------------------------------------------------------------------
# Inject faults while truncating the wal file.
#
do_execsql_test 1.0 {
  PRAGMA auto_vacuum = 0;
  CREATE TABLE t1(a, b);
  PRAGMA journal_mode = wal;
  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s LIMIT 30
  )
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM s;
} {wal}
faultsim_save_and_close

do_faultsim_test 1 -prep {
  catch { db close }
  faultsim_restore
  sqlite3 db file:test.db?psow=0 -uri 1
  file_control_powersafe_overwrite db 0
  execsql {
    PRAGMA wal_checkpoint;
    PRAGMA journal_size_limit = 10000;
    PRAGMA synchronous = full;
  }
} -body {
  execsql { INSERT INTO t1 VALUES(1,1) }
} -test {
  faultsim_test_result {0 {}}
}

#-------------------------------------------------------------------------
# Inject faults while rewriting checksums.
#
reset_db
do_execsql_test 2.0 {
  PRAGMA auto_vacuum = 0;
  CREATE TABLE t1(a, b);
  PRAGMA journal_mode = wal;
  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s LIMIT 30
  )
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM s;
} {wal}
faultsim_save_and_close

do_faultsim_test 2 -prep {
  faultsim_restore_and_reopen
  execsql {
    PRAGMA cache_size = 2;
    BEGIN;
    UPDATE t1 SET a=randomblob(400);
    UPDATE t1 SET b=randomblob(400);
    UPDATE t1 SET a=randomblob(400);
    UPDATE t1 SET b=randomblob(400);
    UPDATE t1 SET a=randomblob(400);
    UPDATE t1 SET b=randomblob(400);
    UPDATE t1 SET a=randomblob(400);
    UPDATE t1 SET b=randomblob(400);
  }
} -body {
  execsql COMMIT
} -test {
  faultsim_test_result {0 {}}
}



finish_test
