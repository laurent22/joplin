# 2018-07-24
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
# it tests that ticket [c694113e50321afdf952e2d1235b08ba663f8399]:
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-c694113d5.100 {
  sqlite3 db :memory:
  db eval {
    CREATE TABLE t1(a INTEGER PRIMARY KEY);
    CREATE TABLE t2(d INTEGER PRIMARY KEY,e,f);
    INSERT INTO t1(a) VALUES(1),(2),(3),(4);
  }
  set answer {}
  db eval {SELECT a FROM t1 WHERE NOT EXISTS(SELECT 1 FROM t2 WHERE d=a)} {
    if {$a==3} {
      lappend answer "CREATE INDEX"
      db eval {CREATE INDEX t2e ON t2(e);}
    }
    lappend answer "a=$a"
  }
  set answer
} {a=1 a=2 {CREATE INDEX} a=3 a=4}
    
finish_test
