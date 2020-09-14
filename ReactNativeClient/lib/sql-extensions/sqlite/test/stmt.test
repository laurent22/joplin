# 2010 February 18
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
# The tests in this file check that SQLite uses (or does not use) a
# statement journal for various SQL statements.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[atomic_batch_write test.db]} {
  finish_test
  return
}

do_test stmt-1.1 {
  execsql { CREATE TABLE t1(a integer primary key, b INTEGER NOT NULL) }
} {}

# The following tests verify the method used for the tests in this file -
# that if a statement journal is required by a statement it is opened and
# remains open until the current transaction is committed or rolled back.
#
# This only work if SQLITE_TEMP_STORE!=3
#
if {$::TEMP_STORE==3} {
  finish_test
  return
}
do_test stmt-1.2 {
  set sqlite_open_file_count
} {1}
do_test stmt-1.3 {
  execsql {
    PRAGMA temp_store = file;
    BEGIN;
      INSERT INTO t1 VALUES(1, 1);
  }
  set sqlite_open_file_count
} {2}
do_test stmt-1.4 {
  execsql {
    INSERT INTO t1 SELECT a+1, b+1 FROM t1;
  }
  set sqlite_open_file_count
  # 2016-03-04: statement-journal open deferred
} {2}
do_test stmt-1.5 {
  execsql COMMIT
  set sqlite_open_file_count
} {1}
do_test stmt-1.6.1 {
  execsql {
    BEGIN;
      INSERT INTO t1 SELECT a+2, b+2 FROM t1;
  }
  set sqlite_open_file_count
} {2}
do_test stmt-1.6.2 {
  execsql { INSERT INTO t1 SELECT a+4, b+4 FROM t1 }
  set sqlite_open_file_count
  # 2016-03-04: statement-journal open deferred
} {2}
do_test stmt-1.7 {
  execsql COMMIT
  set sqlite_open_file_count
} {1}


proc filecount {testname sql expected} {
  uplevel [list do_test $testname [subst -nocommand {
    execsql BEGIN
    execsql { $sql }
    set ret [set sqlite_open_file_count]
    execsql ROLLBACK
    set ret
  }] $expected]
}

filecount stmt-2.1 { INSERT INTO t1 VALUES(9, 9)  } 2
filecount stmt-2.2 { REPLACE INTO t1 VALUES(9, 9) } 2
filecount stmt-2.3 { INSERT INTO t1 SELECT 9, 9   } 2
filecount stmt-2.4 { 
    INSERT INTO t1 SELECT 9, 9;
    INSERT INTO t1 SELECT 10, 10;
} 2

do_test stmt-2.5 {
  execsql { CREATE INDEX i1 ON t1(b) }
} {}
filecount stmt-2.6 { 
  REPLACE INTO t1 VALUES(5, 5);
  REPLACE INTO t1 VALUES(5, 5); 
} 2

finish_test
