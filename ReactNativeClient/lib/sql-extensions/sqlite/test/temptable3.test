# 2016-05-10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix temptable3

db close
sqlite3 db {}
do_execsql_test 1.1 {
  PRAGMA cache_size = 1;
  PRAGMA page_size = 1024;
  PRAGMA auto_vacuum = 2;
  CREATE TABLE t1(x);
  INSERT INTO t1 VALUES( randomblob(800) );
  INSERT INTO t1 VALUES( randomblob(800) );
  CREATE TABLE t2(x);
  PRAGMA integrity_check;
} {ok}

db close
sqlite3 db {}
do_execsql_test 1.2 {
  PRAGMA cache_size = 1;
  PRAGMA auto_vacuum = 2;
  CREATE TABLE t1(x);
  CREATE TABLE t2(x UNIQUE);
  INSERT INTO t2 VALUES(1), (2), (3);
  DROP TABLE t1;
  PRAGMA integrity_check;
} {ok}

finish_test
