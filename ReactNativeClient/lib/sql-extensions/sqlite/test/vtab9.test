# 2006 August 29
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
# focus of this file inserting into virtual tables from a SELECT
# statement.
#
# $Id: vtab9.test,v 1.2 2007/04/16 15:06:26 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

do_test vtab9-1.1 {
  register_echo_module [sqlite3_connection_pointer db]
  execsql {
    CREATE TABLE t0(a);
    CREATE VIRTUAL TABLE t1 USING echo(t0);
    INSERT INTO t1 SELECT 'hello';
    SELECT rowid, * FROM t1;
  }
} {1 hello}

do_test vtab9-1.2 {
  execsql {
    CREATE TABLE t2(a,b,c);
    CREATE VIRTUAL TABLE t3 USING echo(t2);
    CREATE TABLE d1(a,b,c);
    INSERT INTO d1 VALUES(1,2,3);
    INSERT INTO d1 VALUES('a','b','c');
    INSERT INTO d1 VALUES(NULL,'x',123.456);
    INSERT INTO d1 VALUES(x'6869',123456789,-12345);
    INSERT INTO t3(a,b,c) SELECT * FROM d1;
    SELECT rowid, * FROM t3;
  }
} {1 1 2 3 2 a b c 3 {} x 123.456 4 hi 123456789 -12345}

# do_test vtab9-2.1 {
#   execsql {
#     CREATE TABLE t4(a);
#     CREATE VIRTUAL TABLE t5 USING echo(t4);
#     INSERT INTO t4 VALUES('hello');
#     SELECT rowid, a FROM t5;
#   }
# } {1 hello}
# do_test vtab9-2.2 {
#   execsql {
#     INSERT INTO t5(rowid, a) VALUES(1, 'goodbye');
#   }
# } {1 hello}
# do_test vtab9-2.3 {
#   execsql {
#     REPLACE INTO t5(rowid, a) VALUES(1, 'goodbye');
#     SELECT * FROM t5;
#   }
# } {1 goodbye}

unset -nocomplain echo_module_begin_fail
finish_test
