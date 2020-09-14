# 2009 January 2
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
# Verify that a SAVEPOINT on a new, empty database followed by a
# ROLLBACK TO that savepoint starts over again with another new
# empty database.
#
# $Id: savepoint5.test,v 1.1 2009/01/02 21:08:09 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test savepoint5-1.1 {
  db eval {
    SAVEPOINT sp1;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    SELECT count(*) FROM sqlite_master;
    SELECT * FROM t1;
  }
} {1 1}
do_test savepoint5-1.2 {
  db eval {
    ROLLBACK TO sp1;
    SELECT count(*) FROM sqlite_master;
  }
} {0}
do_test savepoint5-1.3 {
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    SELECT count(*) FROM sqlite_master;
    SELECT * FROM t1;
  }
} {1 1}


finish_test
