# 2009 April 14
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
# focus of this file is creating and dropping virtual tables.
#
# $Id: vtabD.test,v 1.3 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab||!schema_pragmas { finish_test ; return }

# Register the echo module
register_echo_module [sqlite3_connection_pointer db]

do_test vtabD-1.1 {
  execsql {
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(a);
    CREATE INDEX i2 ON t1(b);
    CREATE VIRTUAL TABLE tv1 USING echo(t1);
  }
} {}
do_test vtabD-1.2 {
  execsql BEGIN
  for {set i 0} {$i < 100000} {incr i} {
    execsql { INSERT INTO t1 VALUES($i, $i*$i) }
  }
  execsql COMMIT
} {}
do_test vtabD-1.3 {
  execsql { SELECT * FROM tv1 WHERE a = 1 OR b = 4 }
} {1 1 2 4}
do_test vtabD-1.4 {
  execsql { SELECT * FROM tv1 WHERE a = 1 OR b = 1 }
} {1 1}
do_test vtabD-1.5 {
  execsql { SELECT * FROM tv1 WHERE (a > 0 AND a < 5) OR (b > 15 AND b < 65) }
} {1 1 2 4 3 9 4 16 5 25 6 36 7 49 8 64}

do_test vtabD-1.6 {
  execsql { SELECT * FROM tv1 WHERE a < 500 OR b = 810000 }
} [execsql {
  SELECT * FROM t1 WHERE a < 500;
  SELECT * FROM t1 WHERE b = 810000 AND NOT (a < 500);
}]

do_test vtabD-1.7 {
  execsql { SELECT * FROM tv1 WHERE a < 90000 OR b = 8100000000 }
} [execsql {
  SELECT * FROM t1 WHERE a < 90000;
  SELECT * FROM t1 WHERE b = 8100000000 AND NOT (a < 90000);
}]

if {[working_64bit_int]} {
do_test vtabD-1.8 {
  execsql { SELECT * FROM tv1 WHERE a = 90001 OR b = 810000 }
} {90001 8100180001 900 810000}
}

finish_test
