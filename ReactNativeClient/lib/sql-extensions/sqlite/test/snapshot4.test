# 2018 August 28
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. The focus
# of this file is the sqlite3_snapshot_xxx() APIs.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !snapshot {finish_test; return}
set testprefix snapshot4

# This test does not work with the inmemory_journal permutation. The reason
# is that each connection opened as part of this permutation executes
# "PRAGMA journal_mode=memory", which fails if the database is in wal mode
# and there are one or more existing connections.
if {[permutation]=="inmemory_journal"} {
  finish_test
  return
}

sqlite3 db2 test.db

do_execsql_test 1.0 {
  PRAGMA cache_size = 10;
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, randomblob(400));
  PRAGMA journal_mode = wal;
  WITH s(i) AS (
    SELECT 2 UNION ALL SELECT i+1 FROM s WHERE i<100
  ) 
  INSERT INTO t1 SELECT i, randomblob(400) FROM s;
} {wal}

do_test 1.1 {
  execsql {
    BEGIN;
      SELECT count(*) FROM t1;
  }
} {100}

do_test 1.2 {
  db2 eval { 
    SELECT count(*) FROM t1;
    CREATE TABLE t2(x); 
  }
} {100}

do_test 1.3 {
  set ::snap [sqlite3_snapshot_get_blob db main]
  db2 eval { PRAGMA wal_checkpoint }
} {0 54 52}

do_test 1.4 {
  execsql {
    COMMIT;
    SELECT * FROM sqlite_master;
    BEGIN;
  }
  sqlite3_snapshot_open_blob db main $::snap
  execsql {
    SELECT count(*) FROM t1
  } 
} {100}


finish_test
