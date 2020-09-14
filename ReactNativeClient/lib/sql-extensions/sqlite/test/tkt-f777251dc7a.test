# 2009 October 16
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
# This file implements tests to verify that ticket [f777251dc7a] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

do_test tkt-f7772-1.1 {
  execsql {
     CREATE TEMP TABLE t1(x UNIQUE);
     INSERT INTO t1 VALUES(1);
     CREATE TABLE t2(x, y);
     INSERT INTO t2 VALUES(1, 2);
     CREATE TEMP TABLE t3(w, z);
  }
} {}

proc force_rollback {} {
  catch {db eval {INSERT OR ROLLBACK INTO t1 VALUES(1)}}
}
db function force_rollback force_rollback

do_test tkt-f7772-1.2 {
  catchsql {
    BEGIN IMMEDIATE;
    CREATE TABLE xyzzy(abc);
    SELECT x, force_rollback(), EXISTS(SELECT 1 FROM t3 WHERE w=x) FROM t2;
  }
} {1 {abort due to ROLLBACK}}
do_test tkt-f7772-1.3 {
  sqlite3_get_autocommit db
} {1}

do_test tkt-f7772-2.1 {
  execsql {
     DROP TABLE IF EXISTS t1;
     DROP TABLE IF EXISTS t2;
     DROP TABLE IF EXISTS t3;

     CREATE TEMP TABLE t1(x UNIQUE);
     INSERT INTO t1 VALUES(1);
     CREATE TABLE t2(x, y);
     INSERT INTO t2 VALUES(1, 2);
  }
} {}
do_test tkt-f7772-2.2 {
  execsql {
    BEGIN IMMEDIATE;
    CREATE TEMP TABLE t3(w, z);
  }
  catchsql {
    SELECT x, force_rollback(), EXISTS(SELECT 1 FROM t3 WHERE w=x) FROM t2
  }
} {1 {abort due to ROLLBACK}}
do_test tkt-f7772-2.3 {
  sqlite3_get_autocommit db
} {1}

do_test tkt-f7772-3.1 {
  execsql {
    DROP TABLE IF EXISTS t1;
    DROP TABLE IF EXISTS t2;
    DROP TABLE IF EXISTS t3;

    CREATE TEMP TABLE t1(x);
    CREATE TABLE t2(x);
    CREATE TABLE t3(x);
  
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t2 VALUES(1);
    INSERT INTO t2 VALUES(2);
  }
} {}

proc ins {} { db eval {INSERT INTO t3 VALUES('hello')} }
db function ins ins

do_test tkt-f7772-3.2 {
  execsql {
    SELECT ins() AS x FROM t2 UNION ALL SELECT ins() AS x FROM t1
  }
} {{} {} {} {}}
do_test tkt-f7772-3.3 {
  execsql { SELECT * FROM t3 }
} {hello hello hello hello}

finish_test
