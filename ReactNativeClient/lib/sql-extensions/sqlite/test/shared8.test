# 2012 May 15
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
# The tests in this file are intended to show that closing one database
# connection to a shared-cache while there exist other connections (a)
# does not cause the schema to be reloaded and (b) does not cause any
# other problems.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !shared_cache { finish_test ; return }
set testprefix shared8

db close
set ::enable_shared_cache [sqlite3_enable_shared_cache 1]
do_test 0.0 { sqlite3_enable_shared_cache } {1}

proc roman {n} {
  array set R {1 i 2 ii 3 iii 4 iv 5 v 6 vi 7 vii 8 viii 9 ix 10 x}
  set R($n)
}

#-------------------------------------------------------------------------
# The following tests work as follows:
#
#    1.0: Open connection [db1] and populate the database.
#
#    1.1: Using "PRAGMA writable_schema", destroy the database schema on
#         disk. The schema is still in memory, so it is possible to keep
#         using it, but any attempt to reload it from disk will fail.
#
#    1.3-4: Open connection db2. Check that it can see the db schema. Then
#           close db1 and check that db2 still works. This shows that closing
#           db1 did not reset the in-memory schema.
#
#    1.5-7: Similar to 1.3-4.
#
#    1.8: Close all database connections (deleting the in-memory schema).
#         Then open a new connection and check that it cannot read the db.
#         
do_test 1.0 {
  sqlite3 db1 test.db
  db1 func roman roman
  execsql {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 1);
    INSERT INTO t1 VALUES(2, 2);
    INSERT INTO t1 VALUES(3, 3);
    INSERT INTO t1 VALUES(4, 4);
    CREATE VIEW v1 AS SELECT a, roman(b) FROM t1;
    SELECT * FROM v1;
  } db1
} {1 i 2 ii 3 iii 4 iv}

do_test 1.1 {
  sqlite3_db_config db1 DEFENSIVE 0
  execsql { 
    PRAGMA writable_schema = 1;
    DELETE FROM sqlite_master WHERE 1;
    PRAGMA writable_schema = 0;
    SELECT * FROM sqlite_master;
  } db1
} {}

do_test 1.2 {
  execsql { SELECT * FROM v1 } db1
} {1 i 2 ii 3 iii 4 iv}

do_test 1.3 {
  sqlite3 db2 test.db
  db2 func roman roman
  execsql { SELECT * FROM v1 } db2
} {1 i 2 ii 3 iii 4 iv}

do_test 1.4 {
  db1 close
  execsql { SELECT * FROM v1 } db2
} {1 i 2 ii 3 iii 4 iv}

do_test 1.5 {
  sqlite3 db3 test.db
  db3 func roman roman
  execsql { SELECT * FROM v1 } db3
} {1 i 2 ii 3 iii 4 iv}

do_test 1.6 {
  execsql { SELECT * FROM v1 } db2
} {1 i 2 ii 3 iii 4 iv}

do_test 1.7 {
  db2 close
  execsql { SELECT * FROM v1 } db3
} {1 i 2 ii 3 iii 4 iv}

do_test 1.8 {
  db3 close
  sqlite3 db4 test.db
  catchsql { SELECT * FROM v1 } db4
} {1 {no such table: v1}}


foreach db {db1 db2 db3 db4} { catch { $db close } }
sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
