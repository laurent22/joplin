# 2017-07-15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is percentile.c extension
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix unionvtabfault

ifcapable !vtab {
  finish_test
  return
}

forcedelete test.db2
do_execsql_test 1.0 {
  ATTACH 'test.db2' AS aux;
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b TEXT);
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b TEXT);
  CREATE TABLE aux.t3(a INTEGER PRIMARY KEY, b TEXT);

  INSERT INTO t1 VALUES(1, 'one'), (2, 'two'), (3, 'three');
  INSERT INTO t2 VALUES(10, 'ten'), (11, 'eleven'), (12, 'twelve');
  INSERT INTO t3 VALUES(20, 'twenty'), (21, 'twenty-one'), (22, 'twenty-two');
}
faultsim_save_and_close

do_faultsim_test 1.1 -faults * -prep {
  faultsim_restore_and_reopen
  load_static_extension db unionvtab
  execsql { ATTACH 'test.db2' AS aux; }
  execsql { CREATE TEMP TABLE xyz(x); }
} -body {
  execsql {
    CREATE VIRTUAL TABLE temp.uuu USING unionvtab(
    "VALUES(NULL, 't1', 1, 9),  ('main', 't2', 10, 19), ('aux', 't3', 20, 29)"
    );
  }
} -test {
  faultsim_test_result {0 {}}             \
     {1 {vtable constructor failed: uuu}} \
     {1 {sql error: interrupted}}
}

faultsim_restore_and_reopen
load_static_extension db unionvtab
execsql { ATTACH 'test.db2' AS aux; }
execsql { CREATE TEMP TABLE xyz(x); }
execsql {
  CREATE VIRTUAL TABLE temp.uuu USING unionvtab(
      "VALUES(NULL, 't1', 1, 9),  ('main', 't2', 10, 19), ('aux', 't3', 20, 29)"
  );
}
do_faultsim_test 1.2 -faults oom* -prep {
} -body {
  execsql { SELECT * FROM uuu }
} -test {
  faultsim_test_result {0 {1 one 2 two 3 three 10 ten 11 eleven 12 twelve 20 twenty 21 twenty-one 22 twenty-two}} 
}

#-------------------------------------------------------------------------
# Error while registering the two vtab modules.
do_faultsim_test 2.0 -faults * -prep {
  catch { db close }
  sqlite3 db :memory:
} -body {
  load_static_extension db unionvtab
} -test {
  faultsim_test_result {0 {}} {1 {initialization of unionvtab failed: }}
}



finish_test
