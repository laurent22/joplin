#
# 2010 September 17
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is the interactions between the FTS3/4 module 
# and shared-cache mode.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !fts3||!shared_cache {
  finish_test
  return
}
set ::testprefix fts3shared

db close
set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

# Open two connections to the database in shared-cache mode.
#
sqlite3 db test.db
sqlite3 db2 test.db

# Create a virtual FTS3 table. Populate it with some initial data.
#
do_execsql_test fts3shared-1.1 {
  CREATE VIRTUAL TABLE t1 USING fts3(x);
  BEGIN;
  INSERT INTO t1 VALUES('We listened and looked sideways up!');
  INSERT INTO t1 VALUES('Fear at my heart, as at a cup,');
  INSERT INTO t1 VALUES('My life-blood seemed to sip!');
  INSERT INTO t1 VALUES('The stars were dim, and thick the night');
  COMMIT;
} {}

# Open a write transaction and insert rows into the FTS3 table. This takes
# a write-lock on the underlying t1_content table.
#
do_execsql_test fts3shared-1.2 {
  BEGIN;
    INSERT INTO t1 VALUES('The steersman''s face by his lamp gleamed white;');
} {}

# Now try a SELECT on the full-text table. This particular SELECT does not
# read data from the %_content table. But it still attempts to obtain a lock
# on that table and so the SELECT fails.
#
do_test fts3shared-1.3 {
  catchsql {  
    BEGIN;
      SELECT rowid FROM t1 WHERE t1 MATCH 'stars' 
  } db2
} {1 {database table is locked}}

# Verify that the first connection can commit its transaction.
#
do_test fts3shared-1.4 { sqlite3_get_autocommit db } 0
do_execsql_test fts3shared-1.5 { COMMIT } {}
do_test fts3shared-1.6 { sqlite3_get_autocommit db } 1

# Verify that the second connection still has an open transaction.
#
do_test fts3shared-1.6 { sqlite3_get_autocommit db2 } 0

db close
db2 close

#-------------------------------------------------------------------------
# The following tests - fts3shared-2.* - test that unless FTS is bypassed
# and the underlying tables accessed directly, it is not possible for an
# SQLITE_LOCKED error to be enountered when committing an FTS transaction.
#
# Any SQLITE_LOCKED error should be returned when the fts4 (or fts4aux)
# table is first read/written within a transaction, not later on.
#
set LOCKED {1 {database table is locked}}
forcedelete test.db
sqlite3 dbR test.db
sqlite3 dbW test.db
do_test 2.1 {
  execsql {
    CREATE VIRTUAL TABLE t1 USING fts4;
    CREATE TABLE t2ext(a, b);
    CREATE VIRTUAL TABLE t2 USING fts4(content=t2ext);
    CREATE VIRTUAL TABLE t1aux USING fts4aux(t1);
    CREATE VIRTUAL TABLE t2aux USING fts4aux(t2);

    INSERT INTO t1   VALUES('a b c');
    INSERT INTO t2(rowid, a, b) VALUES(1, 'd e f', 'g h i');
  } dbW
} {}

# Test that once [dbW] has written to the FTS table, no client may read
# from the FTS or fts4aux table.
do_test 2.2.1 {
  execsql {
    BEGIN;
      INSERT INTO t1 VALUES('j k l');
  } dbW
  execsql BEGIN dbR
} {}
do_test 2.2.2 { catchsql "SELECT * FROM t1 WHERE rowid=1"          dbR } $LOCKED
do_test 2.2.3 { catchsql "SELECT * FROM t1 WHERE t1 MATCH 'a'"     dbR } $LOCKED
do_test 2.2.4 { catchsql "SELECT rowid FROM t1 WHERE t1 MATCH 'a'" dbR } $LOCKED
do_test 2.2.5 { catchsql "SELECT * FROM t1"                        dbR } $LOCKED
do_test 2.2.6 { catchsql "SELECT * FROM t1aux"                     dbR } $LOCKED
do_test 2.2.7 { execsql COMMIT dbW } {}
do_test 2.2.8 { execsql COMMIT dbR } {}

# Same test as 2.2.*, except with a content= table.
#
do_test 2.3.1 {
  execsql {
    BEGIN;
      INSERT INTO t2(rowid, a, b) VALUES(2, 'j k l', 'm n o');
  } dbW
  execsql BEGIN dbR
} {}
do_test 2.3.3 { catchsql "SELECT * FROM t2 WHERE t2 MATCH 'a'"     dbR } $LOCKED
do_test 2.3.4 { catchsql "SELECT rowid FROM t2 WHERE t2 MATCH 'a'" dbR } $LOCKED
do_test 2.3.6 { catchsql "SELECT * FROM t2aux"                     dbR } $LOCKED
do_test 2.3.7 { execsql COMMIT dbW } {}
do_test 2.3.8 { execsql COMMIT dbR } {}

# Test that once a connection has read from the FTS or fts4aux table, 
# another connection may not write to the FTS table.
#
foreach {tn sql} {
  1 "SELECT * FROM t1 WHERE rowid=1"
  2 "SELECT * FROM t1 WHERE t1 MATCH 'a'" 
  3 "SELECT rowid FROM t1 WHERE t1 MATCH 'a'"
  4 "SELECT * FROM t1"
  5 "SELECT * FROM t1aux"
} {

  do_test 2.4.$tn {
    execsql BEGIN dbR
    execsql $::sql dbR
    execsql BEGIN dbW
    catchsql "INSERT INTO t1 VALUES('p q r')" dbW
  } $LOCKED

  execsql ROLLBACK dbR 
  execsql ROLLBACK dbW 
}

# Same test as 2.4.*, except with a content= table.
#
foreach {tn sql} {
  2 "SELECT * FROM t2 WHERE t2 MATCH 'a'" 
  3 "SELECT rowid FROM t2 WHERE t2 MATCH 'a'"
  5 "SELECT * FROM t2aux"
} {

  do_test 2.5.$tn {
    execsql BEGIN dbR
    execsql $::sql dbR
    execsql BEGIN dbW
    catchsql "INSERT INTO t2(rowid, a, b) VALUES(3, 's t u', 'v w x')" dbW
  } $LOCKED

  execsql ROLLBACK dbR 
  execsql ROLLBACK dbW 
}

dbW close
dbR close
sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
