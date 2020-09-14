# 2009 September 2
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
# This file implements tests to verify that ticket [2ea2425d34be] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-2ea24-1.1 {
  db eval {
    PRAGMA encoding=UTF16;
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,'abc');
    INSERT INTO t1 VALUES(2,'def');
    INSERT INTO t1 VALUES(3,'ghi');
    SELECT a FROM t1 WHERE length(b)<10 AND b<>'def' ORDER BY a;
  }
} {1 3}

finish_test
