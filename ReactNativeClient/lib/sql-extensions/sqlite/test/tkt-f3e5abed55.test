# 2010 July 29
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
source $testdir/malloc_common.tcl

foreach f [glob -nocomplain test.db*mj*] { forcedelete $f }
forcedelete test.db2

do_test tkt-f3e5abed55-1.1 {
  execsql {
    ATTACH 'test.db2' AS aux;
    CREATE TABLE main.t1(a, b);
    CREATE TABLE aux.t2(c, d);
  }
} {}

do_test tkt-f3e5abed55-1.2 {
  glob -nocomplain test.db*mj*
} {}

do_test tkt-f3e5abed55-1.3 {
  sqlite3 db2 test.db
  execsql { BEGIN; SELECT * FROM t1 } db2
} {}

do_test tkt-f3e5abed55-1.4 {
  execsql {
    BEGIN;
      INSERT INTO t1 VALUES(1, 2);
      INSERT INTO t2 VALUES(1, 2);
  }
  catchsql COMMIT
} {1 {database is locked}}

do_test tkt-f3e5abed55-1.5 {
  execsql COMMIT db2
  execsql COMMIT
} {}

do_test tkt-f3e5abed55-1.6 {
  glob -nocomplain test.db*mj*
} {}
foreach f [glob -nocomplain test.db*mj*] { forcedelete $f }
db close
db2 close



# Set up a testvfs so that the next time SQLite tries to delete the
# file "test.db-journal", a snapshot of the current file-system contents
# is taken.
#
# This test will not work with an in-memory journal.
#
if {[permutation]!="inmemory_journal"} {
  testvfs tvfs -default 1
  tvfs script xDelete
  tvfs filter xDelete
  proc xDelete {method file args} {
    if {[file tail $file] == "test.db-journal"} {
      faultsim_save
      tvfs filter {}
    }
    return "SQLITE_OK"
  }
  
  sqlite3 db  test.db
  sqlite3 db2 test.db
  do_test tkt-f3e5abed55-2.1 {
    execsql {
      ATTACH 'test.db2' AS aux;
      BEGIN;
        INSERT INTO t1 VALUES(3, 4);
        INSERT INTO t2 VALUES(3, 4);
    }
  } {}
  do_test tkt-f3e5abed55-2.2 {
    execsql { BEGIN; SELECT * FROM t1 } db2
  } {1 2}
  do_test tkt-f3e5abed55-2.3 {
    catchsql COMMIT
  } {1 {database is locked}}
  
  do_test tkt-f3e5abed55-2.4 {
    execsql COMMIT db2
    execsql {
      COMMIT;
      SELECT * FROM t1;
      SELECT * FROM t2;
    }
  } {1 2 3 4 1 2 3 4}
  do_test tkt-f3e5abed55-2.5 {
    db close
    db2 close
    faultsim_restore_and_reopen
    execsql {
      ATTACH 'test.db2' AS aux;
      SELECT * FROM t1;
      SELECT * FROM t2;
    }
  } {1 2 3 4 1 2 3 4}
}


finish_test
