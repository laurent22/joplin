# 2016 November 18
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
set testprefix snapshot2

# This test does not work with the inmemory_journal permutation. The reason
# is that each connection opened as part of this permutation executes
# "PRAGMA journal_mode=memory", which fails if the database is in wal mode
# and there are one or more existing connections.
if {[permutation]=="inmemory_journal"} {
  finish_test
  return
}

#-------------------------------------------------------------------------
# Check that it is not possible to obtain a snapshot immediately after
# a wal mode database with an empty wal file is opened. But it is after
# the file has been written, even by some other connection.
#
do_execsql_test 1.0 {
  PRAGMA journal_mode = wal;
  CREATE TABLE t1(a, b, c);
  INSERT INTO t1 VALUES(1, 2, 3);
  INSERT INTO t1 VALUES(4, 5, 6);
} {wal}

db close
do_test 1.1.1 { list [file exists test.db] [file exists test.db-wal] } {1 0}

sqlite3 db test.db
do_execsql_test 1.1.2 { SELECT * FROM t1 } {1 2 3 4 5 6}

do_test 1.1.3 {
  execsql BEGIN
  list [catch { sqlite3_snapshot_get_blob db main } msg] $msg
} {1 SQLITE_ERROR}
execsql COMMIT

do_test 1.1.4 {
  execsql { INSERT INTO t1 VALUES(7, 8, 9) }
  execsql BEGIN
  string length [sqlite3_snapshot_get_blob db main]
} 48
execsql COMMIT

db close
do_test 1.2.1 { list [file exists test.db] [file exists test.db-wal] } {1 0}

sqlite3 db test.db
do_execsql_test 1.2.2 { SELECT * FROM t1 } {1 2 3 4 5 6 7 8 9}

do_test 1.2.3 {
  execsql BEGIN
  list [catch { sqlite3_snapshot_get_blob db main } msg] $msg
} {1 SQLITE_ERROR}
execsql COMMIT

do_test 1.2.4 {
  sqlite3 db2 test.db
  execsql { INSERT INTO t1 VALUES(10, 11, 12) } db2
  execsql BEGIN
  string length [sqlite3_snapshot_get_blob db main]
} 48
execsql COMMIT
db2 close

#-------------------------------------------------------------------------
# Simple tests for sqlite3_snapshot_recover().
#
reset_db
do_execsql_test 2.0 {
  CREATE TABLE t1(x);
  PRAGMA journal_mode = wal;
  INSERT INTO t1 VALUES(1);
  INSERT INTO t1 VALUES(2);
} {wal}

do_test 2.1 {
  db trans { set snap [sqlite3_snapshot_get_blob db main] }
  sqlite3_db_config db NO_CKPT_ON_CLOSE 1
  db close
  sqlite3 db test.db

  execsql {SELECT * FROM sqlite_master}
  execsql BEGIN
  sqlite3_snapshot_open_blob db main $snap
  execsql COMMIT;
  execsql { INSERT INTO t1 VALUES(3); }
} {}

do_test 2.2 {
  sqlite3_db_config db NO_CKPT_ON_CLOSE 1
  db close
  sqlite3 db test.db

  execsql {SELECT * FROM sqlite_master}
  execsql BEGIN
  list [catch { sqlite3_snapshot_open_blob db main $snap } msg] $msg
} {1 SQLITE_ERROR_SNAPSHOT}

do_test 2.3 {
  execsql COMMIT
  sqlite3_snapshot_recover db main
  execsql BEGIN
  sqlite3_snapshot_open_blob db main $snap
  execsql { SELECT * FROM t1 }
} {1 2}

do_test 2.4 {
  execsql COMMIT
  execsql { SELECT * FROM t1 }
} {1 2 3}

do_test 2.5 {
  execsql { PRAGMA wal_checkpoint }
  sqlite3_db_config db NO_CKPT_ON_CLOSE 1
  db close
  sqlite3 db test.db

  sqlite3_snapshot_recover db main
  execsql BEGIN
  list [catch { sqlite3_snapshot_open_blob db main $snap } msg] $msg
} {1 SQLITE_ERROR_SNAPSHOT}

#-------------------------------------------------------------------------
# Check that calling sqlite3_snapshot_recover() does not confuse the
# pager cache.
reset_db
do_execsql_test 3.0 {
  PRAGMA journal_mode = wal;
  CREATE TABLE t1(x, y);
  INSERT INTO t1 VALUES('a', 'b');
  INSERT INTO t1 VALUES('c', 'd');
} {wal}
do_test 3.1 {
  sqlite3 db2 test.db
  execsql { INSERT INTO t1 VALUES('e', 'f') } db2
  db2 close
  sqlite3_snapshot_recover db main
} {}
do_execsql_test 3.2 {
  SELECT * FROM t1;
} {a b c d e f}

#-------------------------------------------------------------------------
# Check that sqlite3_snapshot_recover() returns an error if it is called
# with an open read-transaction. Or on a database that does not exist. Or
# on the temp database. Or on a db that is not in wal mode.
#
do_test 4.1 {
  sqlite3_snapshot_recover db main
} {}
do_test 4.2 {
  execsql {
    BEGIN;
      SELECT * FROM sqlite_master;
  }
  list [catch { sqlite3_snapshot_recover db main } msg] $msg
} {1 SQLITE_ERROR}
do_test 4.3 {
  execsql COMMIT
  sqlite3_snapshot_recover db main
} {}
do_test 4.4 {
  list [catch { sqlite3_snapshot_recover db aux } msg] $msg
} {1 SQLITE_ERROR}
do_test 4.5 {
  forcedelete test.db2
  execsql {
    ATTACH 'test.db2' AS aux;
    PRAGMA aux.journal_mode = wal;
    CREATE TABLE aux.t2(x, y);
  }
  list [catch { sqlite3_snapshot_recover db aux } msg] $msg
} {0 {}}
do_test 4.6 {
  list [catch { sqlite3_snapshot_recover db temp } msg] $msg
} {1 SQLITE_ERROR}
do_test 4.7 {
  execsql {
    PRAGMA aux.journal_mode = delete;
  }
  list [catch { sqlite3_snapshot_recover db aux } msg] $msg
} {1 SQLITE_ERROR}

#-------------------------------------------------------------------------
reset_db
sqlite3 db2 test.db 
do_execsql_test 5.0 {
  CREATE TABLE t2(x);
  PRAGMA journal_mode = wal;
  INSERT INTO t2 VALUES('abc');
  INSERT INTO t2 VALUES('def');
  INSERT INTO t2 VALUES('ghi');
} {wal}

do_test 5.1 {
  execsql { 
    SELECT * FROM t2;
    BEGIN;
  } db2
  set snap [sqlite3_snapshot_get_blob db2 main]
  db2 eval END
} {}

do_test 5.2 {
  execsql BEGIN db2
  sqlite3_snapshot_open_blob db2 main $snap
  db2 eval { SELECT * FROM t2 ; END }
} {abc def ghi}

do_test 5.3 {
  execsql { PRAGMA wal_checkpoint = RESTART }
  execsql BEGIN db2
  sqlite3_snapshot_open_blob db2 main $snap
  db2 eval { SELECT * FROM t2 ; END }
} {abc def ghi}

do_test 5.4 {
  execsql { INSERT INTO t2 VALUES('jkl') } 
  execsql BEGIN db2
  list [catch { sqlite3_snapshot_open_blob db2 main $snap } msg] $msg
} {1 SQLITE_ERROR_SNAPSHOT}


finish_test
