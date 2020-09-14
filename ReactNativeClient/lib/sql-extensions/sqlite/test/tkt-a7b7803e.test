# 2012 December 19
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
# it tests that ticket [a7b7803e8d1e8699cd8a460a38133b98892d2e17] has
# been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl

do_test tkt-a7b7803e.1 {
  db eval {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(0,'first'),(99,'fuzzy');
    SELECT (t1.a==0) AS x, b
      FROM t1
     WHERE a=0 OR x;
  }
} {1 first}
do_test tkt-a7b7803e.2 {
  db eval {
    SELECT a, (t1.b='fuzzy') AS x
      FROM t1
     WHERE x
  }
} {99 1}
do_test tkt-a7b7803e.3 {
  db eval {
    SELECT (a=99) AS x, (t1.b='fuzzy') AS y, *
      FROM t1
     WHERE x AND y
  }
} {1 1 99 fuzzy}
do_test tkt-a7b7803e.4 {
  db eval {
    SELECT (a=99) AS x, (t1.b='first') AS y, *
      FROM t1
     WHERE x OR y
     ORDER BY a
  }
} {0 1 0 first 1 0 99 fuzzy}
do_test tkt-a7b7803e.5 {
  db eval {
    SELECT (M.a=99) AS x, M.b, (N.b='first') AS y, N.b
      FROM t1 M, t1 N
     WHERE x OR y
     ORDER BY M.a, N.a
  }
} {0 first 1 first 1 fuzzy 1 first 1 fuzzy 0 fuzzy}
do_test tkt-a7b7803e.6 {
  db eval {
    SELECT (M.a=99) AS x, M.b, (N.b='first') AS y, N.b
      FROM t1 M, t1 N
     WHERE x AND y
     ORDER BY M.a, N.a
  }
} {1 fuzzy 1 first}
do_test tkt-a7b7803e.7 {
  db eval {
    SELECT (M.a=99) AS x, M.b, (N.b='first') AS y, N.b
      FROM t1 M JOIN t1 N ON x AND y
     ORDER BY M.a, N.a
  }
} {1 fuzzy 1 first}
do_test tkt-a7b7803e.8 {
  db eval {
    SELECT (M.a=99) AS x, M.b, (N.b='first') AS y, N.b
      FROM t1 M JOIN t1 N ON x
     ORDER BY M.a, N.a
  }
} {1 fuzzy 1 first 1 fuzzy 0 fuzzy}


finish_test
