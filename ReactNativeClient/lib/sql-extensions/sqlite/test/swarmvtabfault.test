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
# focus of this file is error handling in the swarmvtab extension.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix swarmvtabfault

ifcapable !vtab {
  finish_test
  return
}

proc fetch_db {file} {
  forcedelete $file
  sqlite3 dbX $file
  set rc [catch {
    dbX eval { CREATE TABLE t1(a INTEGER PRIMARY KEY, b) }
  } res]
  dbX close
  if {$rc!=0} {error $res}
}

forcedelete test.db1
forcedelete test.db2

do_execsql_test 1.0 {
  ATTACH 'test.db1' AS aux;
  CREATE TABLE aux.t1(a INTEGER PRIMARY KEY, b);
  INSERT INTO aux.t1 VALUES(1, NULL);
  INSERT INTO aux.t1 VALUES(2, NULL);
  INSERT INTO aux.t1 VALUES(9, NULL);
  DETACH aux;
} {}

faultsim_save_and_close
do_faultsim_test 1.1 -faults oom* -prep {
  faultsim_restore_and_reopen
  db func fetch_db fetch_db
  load_static_extension db unionvtab
  db eval {
    CREATE VIRTUAL TABLE temp.xyz USING swarmvtab(
        'VALUES
        ("test.db1", "t1", 1, 10),
        ("test.db2", "t1", 11, 20)
        ', 'fetch_db'
    );
  }
} -body {
  execsql { SELECT a FROM xyz }
} -test {
  faultsim_test_result {0 {1 2 9}} {1 {sql error: out of memory}}
}

finish_test
