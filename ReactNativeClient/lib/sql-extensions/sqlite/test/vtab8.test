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
# $Id: vtab8.test,v 1.2 2007/03/02 08:12:23 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

register_echo_module [sqlite3_connection_pointer db]

# See ticket #2244
#
do_test vtab1.2244-1 {
  execsql {
    CREATE TABLE t2244(a, b);
    CREATE VIRTUAL TABLE t2244e USING echo(t2244);
    INSERT INTO t2244 VALUES('AA', 'BB');
    INSERT INTO t2244 VALUES('CC', 'DD');
    SELECT rowid, * FROM t2244e;
  }
} {1 AA BB 2 CC DD}
do_test vtab1.2244-2 {
  execsql {
    SELECT * FROM t2244e WHERE rowid = 10;
  }
} {}
do_test vtab1.2244-3 {
  execsql {
    UPDATE t2244e SET a = 'hello world' WHERE 0;
    SELECT rowid, * FROM t2244e;
  }
} {1 AA BB 2 CC DD}

do_test vtab1-2250-2 {
  execsql {
    CREATE TABLE t2250(a, b);
    INSERT INTO t2250 VALUES(10, 20);
    CREATE VIRTUAL TABLE t2250e USING echo(t2250);
    select max(rowid) from t2250;
    select max(rowid) from t2250e;
  }
} {1 1}

# See ticket #2260.
#
do_test vtab1.2260-1 {
  execsql {
    CREATE TABLE t2260a_real(a, b);
    CREATE TABLE t2260b_real(a, b);

    CREATE INDEX i2260 ON t2260a_real(a);
    CREATE INDEX i2260x ON t2260b_real(a);

    CREATE VIRTUAL TABLE t2260a USING echo(t2260a_real);
    CREATE VIRTUAL TABLE t2260b USING echo(t2260b_real);

    SELECT * FROM t2260a, t2260b WHERE t2260a.a = t2260b.a AND t2260a.a > 101;
  }
} {}

unset -nocomplain echo_module_begin_fail
finish_test
