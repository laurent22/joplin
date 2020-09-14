# 2012 Sept 27
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
# focus of this file is testing that the optimizations that disable
# ORDER BY clauses when the natural order of a query is correct.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix orderby2

# Generate test data for a join.  Verify that the join gets the
# correct answer.
#
do_test 1.0 {
  db eval {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
    INSERT INTO t1 VALUES(1,11), (2,22);
    CREATE TABLE t2(d, e, UNIQUE(d,e));
    INSERT INTO t2 VALUES(10, 'ten'), (11,'eleven'), (12,'twelve'),
                         (11, 'oneteen');
  }
} {}

do_test 1.1a {
  db eval {
    SELECT e FROM t1, t2 WHERE a=1 AND d=b ORDER BY d, e;
  }
} {eleven oneteen}
do_test 1.1b {
  db eval {
    EXPLAIN QUERY PLAN
    SELECT e FROM t1, t2 WHERE a=1 AND d=b ORDER BY d, e;
  }
} {~/ORDER BY/}

do_test 1.2a {
  db eval {
    SELECT e FROM t1, t2 WHERE a=1 AND d=b ORDER BY e;
  }
} {eleven oneteen}
do_test 1.2b {
  db eval {
    EXPLAIN QUERY PLAN
    SELECT e FROM t1, t2 WHERE a=1 AND d=b ORDER BY e;
  }
} {~/ORDER BY/}

do_test 1.3a {
  db eval {
    SELECT e, b FROM t1, t2 WHERE a=1 ORDER BY d, e;
  }
} {ten 11 eleven 11 oneteen 11 twelve 11}
do_test 1.3b {
  db eval {
    EXPLAIN QUERY PLAN
    SELECT e, b FROM t1, t2 WHERE a=1 ORDER BY d, e;
  }
} {~/ORDER BY/}

# The following tests derived from TH3 test module cov1/where34.test
#
do_test 2.0 {
  db eval {
    CREATE TABLE t31(a,b); CREATE INDEX t31ab ON t31(a,b);
    CREATE TABLE t32(c,d); CREATE INDEX t32cd ON t32(c,d);
    CREATE TABLE t33(e,f); CREATE INDEX t33ef ON t33(e,f);
    CREATE TABLE t34(g,h); CREATE INDEX t34gh ON t34(g,h);
    
    INSERT INTO t31 VALUES(1,4), (2,3), (1,3);
    INSERT INTO t32 VALUES(4,5), (3,6), (3,7), (4,8);
    INSERT INTO t33 VALUES(5,9), (7,10), (6,11), (8,12), (8,13), (7,14);
    INSERT INTO t34 VALUES(11,20), (10,21), (12,22), (9,23), (13,24),
                          (14,25), (12,26);
    SELECT a||','||c||','||e||','||g FROM t31, t32, t33, t34
     WHERE c=b AND e=d AND g=f
     ORDER BY a ASC, c ASC, e DESC, g ASC;
  }
} {1,3,7,10 1,3,7,14 1,3,6,11 1,4,8,12 1,4,8,12 1,4,8,13 1,4,5,9 2,3,7,10 2,3,7,14 2,3,6,11}
do_test 2.1 {
  db eval {
    SELECT a||','||c||','||e||','||g FROM t31, t32, t33, t34
     WHERE c=b AND e=d AND g=f
     ORDER BY +a ASC, +c ASC, +e DESC, +g ASC;
  }
} {1,3,7,10 1,3,7,14 1,3,6,11 1,4,8,12 1,4,8,12 1,4,8,13 1,4,5,9 2,3,7,10 2,3,7,14 2,3,6,11}
do_test 2.2 {
  db eval {
    SELECT a||','||c||','||e||','||g FROM t31, t32, t33, t34
     WHERE c=b AND e=d AND g=f
     ORDER BY a ASC, c ASC, e ASC, g ASC;
  }
} {1,3,6,11 1,3,7,10 1,3,7,14 1,4,5,9 1,4,8,12 1,4,8,12 1,4,8,13 2,3,6,11 2,3,7,10 2,3,7,14}
do_test 2.3 {
  optimization_control db cover-idx-scan off
  db cache flush
  db eval {
    SELECT a||','||c||','||e||','||g FROM t31, t32, t33, t34
     WHERE c=b AND e=d AND g=f
     ORDER BY a ASC, c ASC, e ASC, g ASC;
  }
} {1,3,6,11 1,3,7,10 1,3,7,14 1,4,5,9 1,4,8,12 1,4,8,12 1,4,8,13 2,3,6,11 2,3,7,10 2,3,7,14}  
optimization_control db all on
db cache flush



finish_test
