# 2005 November 16
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
# This file implements tests to verify that ticket #1501 is
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

do_test tkt1501-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,2);
    SELECT a, b, 'abc' FROM t1
      UNION
      SELECT b, a, 'xyz' FROM t1
      ORDER BY 2, 3;
  }
} {2 1 xyz 1 2 abc}

finish_test
