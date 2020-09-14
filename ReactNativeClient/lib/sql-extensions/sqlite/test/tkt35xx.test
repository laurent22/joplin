# 2008 November 20
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
# When a transaction rolls back, make sure that dirty pages in the
# page cache which are not in the rollback journal are reinitialized
# in the btree layer.
#
# $Id: tkt35xx.test,v 1.4 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt35xx-1.1 {
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA page_size = 1024;
  }
} {}

# Trigger the problem using explicit rollback.
#
do_test tkt35xx-1.1 {
  execsql {
    PRAGMA auto_vacuum = 0;
    CREATE TABLE t1(a,b,c);
    CREATE INDEX i1 ON t1(c);
    INSERT INTO t1 VALUES(0, 0, zeroblob(676));
    INSERT INTO t1 VALUES(1, 1, zeroblob(676));
    DELETE FROM t1;
    BEGIN;
    INSERT INTO t1 VALUES(0, 0, zeroblob(676));
    INSERT INTO t1 VALUES(1, 1, zeroblob(676));
    ROLLBACK;
    INSERT INTO t1 VALUES(0, 0, zeroblob(676));
  }
  execsql {
    INSERT INTO t1 VALUES(1, 1, zeroblob(676));
  }
} {}

# Trigger the problem using statement rollback.
#
db close
delete_file test.db
sqlite3 db test.db
set big [string repeat abcdefghij 22]    ;# 220 byte string
do_test tkt35xx-1.2.1 {
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA page_size = 1024;
    CREATE TABLE t3(a INTEGER PRIMARY KEY, b);
    INSERT INTO t3 VALUES(1, $big);
    INSERT INTO t3 VALUES(2, $big);
    INSERT INTO t3 VALUES(3, $big);
    INSERT INTO t3 VALUES(4, $big);
    CREATE TABLE t4(c, d);
    INSERT INTO t4 VALUES(5, $big);
    INSERT INTO t4 VALUES(1, $big);
  }
} {}
do_test tkt35xx-1.2.2 {
  catchsql {
    BEGIN;
    CREATE TABLE t5(e PRIMARY KEY, f);
    DROP TABLE t5;
    INSERT INTO t3(a, b) SELECT c, d FROM t4;
  }
} {1 {UNIQUE constraint failed: t3.a}}
do_test tkt35xx-1.2.3 {
  # Show that the transaction has not been rolled back.
  catchsql BEGIN
} {1 {cannot start a transaction within a transaction}}
do_test tkt35xx-1.2.4 {
  execsql { SELECT count(*) FROM t3 }
} {4}
do_test tkt35xx-1.2.5 {
  # Before the bug was fixed, if SQLITE_DEBUG was defined an assert()
  # would fail during the following INSERT statement. If SQLITE_DEBUG
  # was not defined, then the statement would pass and the transaction
  # would be committed. But, the "SELECT count(*)" in tkt35xx-1.2.6 would
  # return 1, not 5. Data magically disappeared!
  #
  execsql { 
    INSERT INTO t3 VALUES(5, $big);
    COMMIT;
  }
} {}
do_test tkt35xx-1.2.6 {
  execsql { SELECT count(*) FROM t3 }
} {5}
integrity_check tkt35xx-1.2.7

finish_test
