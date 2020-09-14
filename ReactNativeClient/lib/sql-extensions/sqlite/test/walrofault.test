# 2011 May 09
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
# This file contains tests for using WAL databases in read-only mode.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set ::testprefix walro2

# And only if the build is WAL-capable.
#
ifcapable !wal {
  finish_test
  return
}

db close
sqlite3_shutdown
sqlite3_config_uri 1
sqlite3 db test.db

do_execsql_test 1.0 {
  CREATE TABLE t1(b);
  PRAGMA journal_mode = wal;
  INSERT INTO t1 VALUES('hello');
  INSERT INTO t1 VALUES('world');
  INSERT INTO t1 VALUES('!');
  INSERT INTO t1 VALUES('world');
  INSERT INTO t1 VALUES('hello');
  PRAGMA cache_size = 10;
  BEGIN;
    WITH s(i) AS ( SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<30 ) 
    INSERT INTO t1(b) SELECT randomblob(800) FROM s;
} {wal}
file_control_persist_wal db 1; db close
faultsim_save_and_close

do_faultsim_test 1 -faults oom* -prep {
  catch { db close }
  faultsim_restore
  sqlite3 db file:test.db?readonly_shm=1
} -body {
  execsql { SELECT * FROM t1 }
} -test {
  faultsim_test_result {0 {hello world ! world hello}}
}



finish_test
