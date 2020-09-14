# 2007 Sep 12
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2643 has been fixed.
#
# $Id: tkt2643.test,v 1.1 2007/09/13 17:54:41 drh Exp $
#

# The problem in ticket #2643 has to do with the query optimizer
# making bad assumptions about index cost when data from ANALYZE
# is available.

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt2643-1.1 {
  execsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE, c);
    INSERT INTO t1 VALUES(1,2,3);
    INSERT INTO t1 VALUES(2,3,4);
    ANALYZE;
  }
  db close
  sqlite3 db test.db
  execsql {
    CREATE INDEX i1 ON t1(c);
    SELECT count(*) FROM t1 WHERE c IS NOT NULL
  }
} {2}

finish_test
