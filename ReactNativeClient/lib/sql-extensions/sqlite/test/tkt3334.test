# 2008 August 26
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
# This file implements regression tests for SQLite library. 
# Specifically, it tests that bug #3334 has been fixed by the
# addition of restriction (19) to the subquery flattener optimization.
#
# $Id: tkt3334.test,v 1.1 2008/08/26 12:56:14 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3334-1.0 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,934);
    INSERT INTO t1 VALUES(2,221);
    INSERT INTO t1 VALUES(1,372);
    INSERT INTO t1 VALUES(3,552);
    INSERT INTO t1 VALUES(1,719);
    INSERT INTO t1 VALUES(4,102);
    SELECT * FROM t1 ORDER BY b;
  }
} {4 102 2 221 1 372 3 552 1 719 1 934}

do_test tkt3334-1.1 {
  execsql {
    SELECT a FROM (SELECT a FROM t1 ORDER BY b LIMIT 2) WHERE a=1;
  }
} {}
do_test tkt3334-1.2 {
  execsql {
    SELECT count(*) FROM (SELECT a FROM t1 ORDER BY b LIMIT 2) WHERE a=1;
  }
} {0}
do_test tkt3334-1.3 {
  execsql {
    SELECT a FROM (SELECT a FROM t1 ORDER BY b LIMIT 3) WHERE a=1;
  }
} {1}
do_test tkt3334-1.4 {
  execsql {
    SELECT count(*) FROM (SELECT a FROM t1 ORDER BY b LIMIT 3) WHERE a=1;
  }
} {1}
do_test tkt3334-1.5 {
  execsql {
    SELECT a FROM (SELECT a FROM t1 ORDER BY b LIMIT 99) WHERE a=1;
  }
} {1 1 1}
do_test tkt3334-1.6 {
  execsql {
    SELECT count(*) FROM (SELECT a FROM t1 ORDER BY b LIMIT 99) WHERE a=1;
  }
} {3}
do_test tkt3334-1.7 {
  execsql {
    SELECT a FROM (SELECT a FROM t1 ORDER BY b) WHERE a=1;
  }
} {1 1 1}
do_test tkt3334-1.8 {
  execsql {
    SELECT count(*) FROM (SELECT a FROM t1 ORDER BY b) WHERE a=1;
  }
} {3}
do_test tkt3334-1.9 {
  execsql {
    SELECT a FROM (SELECT a FROM t1) WHERE a=1;
  }
} {1 1 1}
do_test tkt3334-1.10 {
  execsql {
    SELECT count(*) FROM (SELECT a FROM t1) WHERE a=1;
  }
} {3}

finish_test
