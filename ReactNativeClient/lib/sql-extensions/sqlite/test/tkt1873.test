# 2006 June 27
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
# This file implements tests to verify that ticket #1873 has been
# fixed.  
#
#
# $Id: tkt1873.test,v 1.2 2007/10/09 08:29:33 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !attach {
  finish_test
  return
}

forcedelete test2.db test2.db-journal

do_test tkt1873-1.1 {
  execsql {
    CREATE TABLE t1(x, y);
    ATTACH 'test2.db' AS aux;
    CREATE TABLE aux.t2(x, y);
    INSERT INTO t1 VALUES(1, 2);
    INSERT INTO t1 VALUES(3, 4);
    INSERT INTO t2 VALUES(5, 6);
    INSERT INTO t2 VALUES(7, 8);
  }
} {}

do_test tkt1873-1.2 {
  set rc [catch {
    db eval {SELECT * FROM t2 LIMIT 1} {
      db eval {DETACH aux}
    }
  } msg]
  list $rc $msg
} {1 {database aux is locked}}

do_test tkt1873-1.3 {
  set rc [catch {
    db eval {SELECT * FROM t1 LIMIT 1} {
      db eval {DETACH aux}
    }
  } msg]
  list $rc $msg
} {0 {}}

do_test tkt1873-1.4 {
  catchsql {
    select * from t2;
  }
} {1 {no such table: t2}}

do_test tkt1873-1.5 {
  catchsql {
    ATTACH 'test2.db' AS aux;
    select * from t2;
  }
} {0 {5 6 7 8}}

finish_test
