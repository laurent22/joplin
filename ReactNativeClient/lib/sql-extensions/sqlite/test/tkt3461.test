# 2008 October 25
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
# This file implements tests to verify that ticket #3461 has been
# fixed.  
#
# $Id: tkt3461.test,v 1.4 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

####################################
####################################
# REMOVE THESE TWO LINES:
####################################
####################################
#finish_test
#return

do_test tkt3461-1.1 {
  execsql {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
  }
} {}

do_test tkt3461-1.2 {
  execsql { SELECT a, b+1 AS b_plus_one FROM t1 WHERE a=1 }
} {1 3}

do_test tkt3461-1.3 {
  # explain { SELECT a, b+1 AS b_plus_one FROM t1 WHERE a=1 OR b_plus_one }
  # execsql { PRAGMA vdbe_trace = 1; PRAGMA vdbe_listing=1 }
  execsql { SELECT a, b+1 AS b_plus_one FROM t1 WHERE a=1 OR b_plus_one }
} {1 3}

do_test tkt3461-2.1 {
  execsql { 
    SELECT a, b+1 AS b_plus_one 
    FROM t1 
    WHERE CASE WHEN a=1 THEN 1 ELSE b_plus_one END 
  }
} {1 3}

do_test tkt3461-3.1 {
  execsql {
    CREATE TABLE t2(c, d);
    INSERT INTO t2 VALUES(3, 4);
  }
  # execsql { PRAGMA vdbe_trace = 1; PRAGMA vdbe_listing=1 }
  execsql { 
    SELECT a, b+1 AS b_plus_one, c, d 
    FROM t1 LEFT JOIN t2 
    ON (a=c AND d=b_plus_one)
  }
} {1 3 {} {}}

finish_test
