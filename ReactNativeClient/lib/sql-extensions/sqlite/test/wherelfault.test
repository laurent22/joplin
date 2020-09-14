# 2008 October 6
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
# focus of this file is testing fault-injection with the 
# LIMIT ... OFFSET ... clause of UPDATE and DELETE statements.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix wherelfault

ifcapable !update_delete_limit {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, 'f');
  INSERT INTO t1 VALUES(2, 'e');
  INSERT INTO t1 VALUES(3, 'd');
  INSERT INTO t1 VALUES(4, 'c');
  INSERT INTO t1 VALUES(5, 'b');
  INSERT INTO t1 VALUES(6, 'a');

  CREATE VIEW v1 AS SELECT a,b FROM t1;
  CREATE TABLE log(op, a);

  CREATE TRIGGER v1del INSTEAD OF DELETE ON v1 BEGIN
    INSERT INTO log VALUES('delete', old.a);
  END;

  CREATE TRIGGER v1upd INSTEAD OF UPDATE ON v1 BEGIN
    INSERT INTO log VALUES('update', old.a);
  END;
}

faultsim_save_and_close
do_faultsim_test 1.1 -prep {
  faultsim_restore_and_reopen
  db eval {SELECT * FROM sqlite_master}
} -body {
  execsql { DELETE FROM v1 ORDER BY a LIMIT 3; }
} -test {
  faultsim_test_result {0 {}} 
}

do_faultsim_test 1.2 -prep {
  faultsim_restore_and_reopen
  db eval {SELECT * FROM sqlite_master}
} -body {
  execsql { UPDATE v1 SET b = 555 ORDER BY a LIMIT 3 }
} -test {
  faultsim_test_result {0 {}} 
}

#-------------------------------------------------------------------------
sqlite3 db test.db
do_execsql_test 2.1.0 {
  CREATE TABLE t2(a, b, c, PRIMARY KEY(a, b)) WITHOUT ROWID;
}
faultsim_save_and_close

do_faultsim_test 2.1 -prep {
  faultsim_restore_and_reopen
  db eval {SELECT * FROM sqlite_master}
} -body {
  execsql { DELETE FROM t2 WHERE c=? ORDER BY a DESC LIMIT 10 }
} -test {
  faultsim_test_result {0 {}} 
}

finish_test
