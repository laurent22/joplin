# 2005 November 24
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
# This file implements tests to verify that ticket #1536 is
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt1536-1.1 {
  execsql {
    CREATE TABLE t1(
      a INTEGER PRIMARY KEY,
      b TEXT
    );
    INSERT INTO t1 VALUES(1,'01');
    SELECT typeof(a), typeof(b) FROM t1;
  }
} {integer text}
do_test tkt1536-1.2 {
  execsql {
    INSERT INTO t1(b) SELECT b FROM t1;
    SELECT b FROM t1 WHERE rowid=2;
  }
} {01}
 

finish_test
