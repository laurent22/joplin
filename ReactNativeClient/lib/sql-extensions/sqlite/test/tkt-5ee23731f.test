# 2009 October 13
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
# This file implements tests to verify that ticket [5ee23731f15] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-5ee237-1.1 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    CREATE TABLE t1(x UNIQUE);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 SELECT x+2 FROM t1;
    INSERT INTO t1 SELECT x+4 FROM t1;
    INSERT INTO t1 SELECT x+8 FROM t1;
  }
  db close
  sqlite3 db test.db -readonly 1
  set rc [catch {
    db eval {SELECT rowid, x FROM t1 ORDER BY x} {
      db eval {UPDATE t1 SET x=x+1 WHERE rowid=:rowid}
    }
  } msg]
  lappend rc $msg
} {1 {attempt to write a readonly database}}

finish_test
