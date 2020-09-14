# 2009 June 23
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
# Tests to verify ticket #3929 is fixed.
#
# $Id: tkt3929.test,v 1.1 2009/06/23 11:53:09 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

do_test tkt3929-1.0 {
  execsql {
    PRAGMA page_size = 1024;
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(a, b);
    CREATE TRIGGER t1_t1 AFTER INSERT ON t1 BEGIN
      UPDATE t1 SET b = 'value: ' || a WHERE t1.rowid = new.rowid;
    END;
  }
} {}

do_test tkt3929-1.1 {
  execsql {
    INSERT INTO t1(a) VALUES(1);
    INSERT INTO t1(a) VALUES(2);
    SELECT * FROM t1;
  }
} {1 {value: 1} 2 {value: 2}}

# Before it was fixed, the following provoked the bug, causing either an
# assertion failure or a "database is malformed" error.
#
do_test tkt3930-1.2 {
  for {set i 3} {$i < 100} {incr i} {
    execsql { INSERT INTO t1(a) VALUES($i) }
  }
} {}

integrity_check tkt3930-1.3
finish_test
