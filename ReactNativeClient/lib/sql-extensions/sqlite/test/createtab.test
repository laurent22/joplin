# 2007 May 02
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
# focus of this file is testing that it is OK to create new tables
# and indices while creating existing tables and indices.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable autovacuum {
  set upperBound 2
} else {
  set upperBound 0
}

# Run these tests for all possible values of autovacuum.
#
for {set av 0} {$av<=$upperBound} {incr av} {
  db close
  forcedelete test.db test.db-journal
  sqlite3 db test.db

  # Create a table that spans multiple pages.  It is important
  # that part of the database be in pages beyond the root page.
  #
  do_test createtab-$av.1 {
    execsql "PRAGMA auto_vacuum=$av"
    execsql {
      PRAGMA page_size=1024;
      CREATE TABLE t1(x INTEGER PRIMARY KEY, y);
      INSERT INTO t1 VALUES(1, hex(randomblob(200)));
      INSERT INTO t1 VALUES(2, hex(randomblob(200)));
      INSERT INTO t1 VALUES(3, hex(randomblob(200)));
      INSERT INTO t1 VALUES(4, hex(randomblob(200)));
      SELECT count(*) FROM t1;
    }
  } {4}

  set isUtf16 0
  ifcapable utf16 { 
    set isUtf16 [expr {[execsql {PRAGMA encoding}] != "UTF-8"}]
  }

  do_test createtab-$av.2 {
    file size test.db
  } [expr {1024*(4+($av!=0)+(${isUtf16}*2))}]
  
  # Start reading the table
  #
  do_test createtab-$av.3 {
    set STMT [sqlite3_prepare db {SELECT x FROM t1} -1 TAIL]
    sqlite3_step $STMT
  } {SQLITE_ROW}
  do_test createtab-$av.4 {
    sqlite3_column_int $STMT 0
  } {1}
  
  # While still reading the table, create a new table.
  #
  do_test createtab-$av.5 {
    execsql {
      CREATE TABLE t2(a,b);
      INSERT INTO t2 VALUES(1,2);
      SELECT * FROM t2;
    }
  } {1 2}
  
  # Continue reading the original table.
  #
  do_test createtab-$av.6 {
    sqlite3_column_int $STMT 0
  } {1}
  do_test createtab-$av.7 {
    sqlite3_step $STMT
  } {SQLITE_ROW}
  do_test createtab-$av.8 {
    sqlite3_column_int $STMT 0
  } {2}
  
  # Do another cycle of creating a new database table while contining
  # to read the original table.
  #
  do_test createtab-$av.11 {
    execsql {
      CREATE TABLE t3(a,b);
      INSERT INTO t3 VALUES(4,5);
      SELECT * FROM t3;
    }
  } {4 5}
  do_test createtab-$av.12 {
    sqlite3_column_int $STMT 0
  } {2}
  do_test createtab-$av.13 {
    sqlite3_step $STMT
  } {SQLITE_ROW}
  do_test createtab-$av.14 {
    sqlite3_column_int $STMT 0
  } {3}
  
  # One more cycle.
  #
  do_test createtab-$av.21 {
    execsql {
      CREATE TABLE t4(a,b);
      INSERT INTO t4 VALUES('abc','xyz');
      SELECT * FROM t4;
    }
  } {abc xyz}
  do_test createtab-$av.22 {
    sqlite3_column_int $STMT 0
  } {3}
  do_test createtab-$av.23 {
    sqlite3_step $STMT
  } {SQLITE_ROW}
  do_test createtab-$av.24 {
    sqlite3_column_int $STMT 0
  } {4}
  
  # Finish reading.  Do an integrity check on the database.
  #
  do_test createtab-$av.30 {
    sqlite3_step $STMT
  } {SQLITE_DONE}
  do_test createtab-$av.31 {
    sqlite3_finalize $STMT
  } {SQLITE_OK}
  do_test createtab-$av.32 {
    execsql {
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1
    }
  } {t1 t2 t3 t4}
  integrity_check createtab-$av.40

}

# 2019-03-31 Ensure that a proper error is returned for an index
# with too many columns.
#
do_test createtab-3.1 {
  db eval {DROP TABLE IF EXISTS t1;}
  set sql "CREATE TABLE t1(x,UNIQUE(x[string repeat ,x 100000]))"
  catchsql $sql
} {1 {too many columns in index}}
  
finish_test
