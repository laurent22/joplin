# 2016-08-19
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
# This file implements a test for VACUUM on attached databases.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix vacuum5

# If the VACUUM statement is disabled in the current build, skip all
# the tests in this file.
#
ifcapable !vacuum {
  finish_test
  return
}

forcedelete test2.db test3.db
do_execsql_test vacuum5-1.1 {
  PRAGMA auto_vacuum = 0;
  CREATE TABLE main.t1(a,b);
  WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<1000)
    INSERT INTO t1(a,b) SELECT x, randomblob(1000) FROM c;
  CREATE TEMP TABLE ttemp(x,y);
  INSERT INTO ttemp SELECT * FROM t1;
  ATTACH 'test2.db' AS x2;
  ATTACH 'test3.db' AS x3;
  CREATE TABLE x2.t2(c,d);
  INSERT INTO t2 SELECT * FROM t1;
  CREATE TABLE x3.t3(e,f);
  INSERT INTO t3 SELECT * FROM t1;
  DELETE FROM t1 WHERE (rowid%3)!=0;
  DELETE FROM t2 WHERE (rowid%4)!=0;
  DELETE FROM t3 WHERE (rowid%5)!=0;
  PRAGMA main.integrity_check;
  PRAGMA x2.integrity_check;
  PRAGMA x3.integrity_check;
} {ok ok ok}
set size1 [file size test.db]
set size2 [file size test2.db]
set size3 [file size test3.db]

do_execsql_test vacuum5-1.2.1 {
  VACUUM main;
} {}
do_test vacuum5-1.2.2 {
  expr {[file size test.db]<$size1}
} {1}
do_test vacuum5-1.2.3 {
  file size test2.db
} $size2
do_test vacuum5-1.2.4 {
  file size test3.db
} $size3
set size1 [file size test.db]
do_execsql_test vacuum-1.2.5 {
  DELETE FROM t1;
  PRAGMA main.integrity_check;
} {ok}

do_execsql_test vacuum5-1.3.1 {
  VACUUM x2;
} {}
do_test vacuum5-1.3.2 {
  file size test.db
} $size1
do_test vacuum5-1.3.3 {
  expr {[file size test2.db]<$size2}
} 1
do_test vacuum5-1.3.4 {
  file size test3.db
} $size3
set size2 [file size test2.db]
do_execsql_test vacuum-1.3.5 {
  DELETE FROM t2;
  PRAGMA x2.integrity_check;
} {ok}

do_execsql_test vacuum5-1.4.1 {
  VACUUM x3;
} {}
do_test vacuum5-1.3.2 {
  file size test.db
} $size1
do_test vacuum5-1.3.3 {
  file size test2.db
} $size2
do_test vacuum5-1.3.4 {
  expr {[file size test3.db]<$size3}
} 1

# VACUUM is a no-op on the TEMP table
#
set sizeTemp [db one {PRAGMA temp.page_count}]
do_execsql_test vacuum5-1.4.1 {
  VACUUM temp;
} {}
do_execsql_test vacuum5-1.4.2 {
  PRAGMA temp.page_count;
} $sizeTemp

do_catchsql_test vacuum5-2.0 {
  VACUUM olaf;
} {1 {unknown database olaf}}

#-------------------------------------------------------------------------
# Test that a temp file is opened as part of VACUUM.
#
if {$::TEMP_STORE<3 && [permutation]!="inmemory_journal"} {
  db close
  testvfs tvfs 
  tvfs filter xOpen
  tvfs script open_cb
  forcedelete test.db

  set ::openfiles [list]
  proc open_cb {method args} {
    lappend ::openfiles [file tail [lindex $args 0]]
  }
  sqlite3 db test.db -vfs tvfs

  do_execsql_test 3.0 {
    PRAGMA temp_store = file;
    PRAGMA page_size = 1024;
    PRAGMA cache_size = 50;
    CREATE TABLE t1(i INTEGER PRIMARY KEY, j UNIQUE);
    WITH s(i) AS (
      VALUES(1) UNION ALL SELECT i+1 FROM s WHERE i<1000
    )
    INSERT INTO t1 SELECT NULL, randomblob(100) FROM s;
  }

  do_execsql_test 3.1 { VACUUM }

  db close
  tvfs delete
  if {[atomic_batch_write test.db]==0} {
    do_test 3.2 {
      lrange $::openfiles 0 4
    } {test.db test.db-journal test.db-journal {} test.db-journal}
  }
} 



finish_test
