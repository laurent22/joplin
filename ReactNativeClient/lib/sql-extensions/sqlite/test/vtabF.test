# 2011 Aug 1
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
# This file checks to make sure IS NOT NULL constraints work on
# virtual tables.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab||!schema_pragmas { finish_test ; return }

# Register the echo module
register_echo_module [sqlite3_connection_pointer db]

do_test vtabF-1.1 {
  execsql {
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(a);
    CREATE INDEX i2 ON t1(b);
    INSERT INTO t1 VALUES(10,110);
    INSERT INTO t1 VALUES(11,111);
    INSERT INTO t1 SELECT a+2, b+2 FROM t1;
    INSERT INTO t1 SELECT null, b+4 FROM t1;
    INSERT INTO t1 SELECT null, b+8 FROM t1;
    INSERT INTO t1 SELECT null, b+16 FROM t1;
    ANALYZE;
    CREATE VIRTUAL TABLE tv1 USING echo(t1);
    SELECT b FROM t1 WHERE a IS NOT NULL;
  }
} {110 111 112 113}
do_test vtabF-1.2 {
  execsql {SELECT b FROM tv1 WHERE a IS NOT NULL}
} {110 111 112 113}


finish_test
