# 2008 April 10
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
# focus of this file is is verifying that a virtual table in the
# TEMP database that is created and dropped within a transaction
# is handled correctly.  Ticket #2994.
#
# Also make sure a virtual table on the right-hand side of an IN operator
# is materialized rather than being used directly.  Ticket #3082.
#

#
# $Id: vtabB.test,v 1.2 2008/04/25 12:10:15 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

do_test vtabB-1.1 {
  register_echo_module [sqlite3_connection_pointer db]
  execsql {
    CREATE TABLE t1(x);
    BEGIN;
    CREATE VIRTUAL TABLE temp.echo_test1 USING echo(t1);
    DROP TABLE echo_test1;
    ROLLBACK;
  }
} {}

do_test vtabB-2.1 {
  execsql {
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 VALUES(3);
    CREATE TABLE t2(y);
    INSERT INTO t2 VALUES(1);
    INSERT INTO t2 VALUES(2);
    CREATE VIRTUAL TABLE echo_t2 USING echo(t2);
    SELECT * FROM t1 WHERE x IN (SELECT rowid FROM t2);
  }
} {2}
do_test vtab8-2.2 {
  execsql {
    SELECT rowid FROM echo_t2
  }
} {1 2}
do_test vtabB-2.3 {
  execsql {
    SELECT * FROM t1 WHERE x IN (SELECT rowid FROM t2);
  }
} {2}
do_test vtabB-2.4 {
  execsql {
    SELECT * FROM t1 WHERE x IN (SELECT rowid FROM echo_t2);
  }
} {2}
do_test vtabB-2.5 {
  execsql {
    SELECT * FROM t1 WHERE x IN (SELECT y FROM t2);
  }
} {2}
do_test vtabB-2.6 {
  execsql {
    SELECT * FROM t1 WHERE x IN (SELECT y FROM echo_t2);
  }
} {2}

finish_test
