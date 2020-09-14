# 2008 Jan 21
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
# This file implements tests for the sqlite3_exec interface
#
# $Id: exec.test,v 1.1 2008/01/21 16:22:46 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test exec-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,2);
    SELECT * FROM t1;
  }
} {1 2}
do_test exec-1.2 {
  sqlite3_exec db {/* comment */;;; SELECT * FROM t1; /* comment */}
} {0 {a b 1 2}}
do_test exec-1.3 {
  sqlite3 db2 test.db
  db2 eval {CREATE TABLE t2(x, y);}
  db2 close
  sqlite3_exec db {SELECT * FROM t1}
} {0 {a b 1 2}}

finish_test
