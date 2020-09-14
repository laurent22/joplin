# 2012 February 28
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
# Specifically, it tests the case where a connection opens an empty
# file. Then, another connection opens the same file and initializes
# the connection as a WAL database. Following this, the first connection
# executes a "PRAGMA page_size = XXX" command to set its expected page
# size, and then queries the database.
#
# This is an unusual case, as normally SQLite is able to glean the page
# size from the database file as soon as it is opened (even before the
# first read transaction is executed), and the "PRAGMA page_size = XXX"
# is a no-op.
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix wal8
ifcapable !wal {finish_test ; return }
do_not_use_codec

db close
forcedelete test.db test.db-wal

sqlite3 db test.db
sqlite3 db2 test.db

do_test 1.0 {
  execsql {
    PRAGMA journal_mode = wal;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
  } db2
} {wal}

do_catchsql_test 1.1 {
  PRAGMA page_size = 4096;
  VACUUM;
} {0 {}}

db close
db2 close
forcedelete test.db test.db-wal

sqlite3 db test.db
sqlite3 db2 test.db

do_test 2.0 {
  execsql {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
    PRAGMA journal_mode = wal;
  } db2
} {wal}

do_catchsql_test 2.1 {
  PRAGMA page_size = 4096;
  VACUUM;
} {0 {}}

db close
db2 close
forcedelete test.db test.db-wal

sqlite3 db test.db
sqlite3 db2 test.db

do_test 3.0 {
  execsql {
    PRAGMA journal_mode = wal;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
  } db2
} {wal}

do_execsql_test 3.1 {
  PRAGMA page_size = 4096;
  SELECT name FROM sqlite_master;
} {t1}

finish_test
