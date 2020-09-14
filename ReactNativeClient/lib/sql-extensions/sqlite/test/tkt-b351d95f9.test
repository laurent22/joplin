# 2010 September 28
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [b351d95f9cd5ef17e9d9dbae18f5ca8611190001] has been
# resolved.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl

do_test tkt-b351d95.1 {
  execsql {
    CREATE table t1(a,b);
    INSERT INTO t1 VALUES('name1','This is a test');
    INSERT INTO t1 VALUES('name2','xyz');
    CREATE TABLE t2(x,y);
    INSERT INTO t2 SELECT a, CASE b WHEN 'xyz' THEN null ELSE b END FROM t1;
    SELECT x, y FROM t2 ORDER BY x;
  }
} {name1 {This is a test} name2 {}}

do_test tkt-b351d95.2 {
  execsql {
    DELETE FROM t2;
    INSERT INTO t2 SELECT a, coalesce(b,a) FROM t1;
    SELECT x, y FROM t2 ORDER BY x;
  }
} {name1 {This is a test} name2 xyz}
do_test tkt-b351d95.3 {
  execsql {
    DELETE FROM t2;
    INSERT INTO t2 SELECT a, coalesce(b,a) FROM t1;
    SELECT x, y BETWEEN 'xy' AND 'xz' FROM t2 ORDER BY x;
  }
} {name1 0 name2 1}

finish_test
