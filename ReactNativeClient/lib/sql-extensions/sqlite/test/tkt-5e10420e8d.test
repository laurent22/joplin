# 2010 August 23
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test tkt-5e10420e8d.1 {
  PRAGMA page_size = 1024;
  PRAGMA auto_vacuum = incremental;

  CREATE TABLE t1(x);
  CREATE TABLE t2(x);
  CREATE TABLE t3(x);
} {}

do_execsql_test tkt-5e10420e8d.2 {
  INSERT INTO t3 VALUES(randomblob(500 + 1024*248));
  INSERT INTO t1 VALUES(randomblob(1500));
  INSERT INTO t2 VALUES(randomblob(500 + 1024*248));

  DELETE FROM t3;
  DELETE FROM t2;
  DELETE FROM t1;
} {}

do_execsql_test tkt-5e10420e8d.3 {
  PRAGMA incremental_vacuum(248)
} {}

do_execsql_test tkt-5e10420e8d.4 {
  PRAGMA incremental_vacuum(1)
} {}

db close
sqlite3 db test.db

do_execsql_test tkt-5e10420e8d.5 {
  PRAGMA integrity_check;
} {ok}

finish_test
