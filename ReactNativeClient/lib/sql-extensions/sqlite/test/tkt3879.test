# 2009 May 25
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Tests to verify ticket #3879 is fixed.
#
# $Id: tkt3879.test,v 1.2 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3879.1.1 {
  execsql {
    CREATE TABLE t1 (a PRIMARY KEY, b);
    INSERT INTO t1 VALUES ('w',  1);
    INSERT INTO t1 VALUES ('z', -1);
  
    CREATE TABLE t2 (m INTEGER PRIMARY KEY, n, a, p);
    INSERT INTO t2 VALUES (25, 13, 'w', 1);
    INSERT INTO t2 VALUES (26, 25, 'z', 153);
    INSERT INTO t2 VALUES (27, 25, 'z', 68);

    CREATE TABLE t3 (m);
    INSERT INTO t3 VALUES (25);
  }
} {}

do_test tkt3879.1.2 {
  execsql {
    SELECT 111, t1.b*123
    FROM t3, t2 AS j0, t2 AS j1, t1
    WHERE j0.m=t3.m AND t1.a=j0.a AND j1.n=j0.m;
  }
} {111 123 111 123}

do_test tkt3879.1.3 {
  execsql {
    SELECT 222, t1.b*123
    FROM t3, t2 AS j0, t2 AS j1, t1
    WHERE j0.m=t3.m AND t1.a=j0.a AND j1.n=j0.m
    ORDER BY t1.b;
  }
} {222 123 222 123}

finish_test
