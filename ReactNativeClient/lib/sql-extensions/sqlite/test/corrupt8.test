# 2008 July 9
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
# This file implements tests to make sure SQLite does not crash or
# segfault if it sees a corrupt database file.  It specifically focuses
# on corrupt pointer map pages.
#
# $Id: corrupt8.test,v 1.2 2008/07/11 03:34:10 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# These tests deal with corrupt database files
#
database_may_be_corrupt

# We must have the page_size pragma for these tests to work.
#
ifcapable !pager_pragmas||!autovacuum {
  finish_test
  return
}

# Create a database to work with.
#
do_test corrupt8-1.1 {
  execsql {
    PRAGMA auto_vacuum=1;
    PRAGMA page_size=1024;
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES(1);
    INSERT INTO t1(x) VALUES(2);
    INSERT INTO t1(x) SELECT x+2 FROM t1;
    INSERT INTO t1(x) SELECT x+4 FROM t1;
    INSERT INTO t1(x) SELECT x+8 FROM t1;
    INSERT INTO t1(x) SELECT x+16 FROM t1;
    INSERT INTO t1(x) SELECT x+32 FROM t1;
    INSERT INTO t1(x) SELECT x+64 FROM t1;
    INSERT INTO t1(x) SELECT x+128 FROM t1;
    INSERT INTO t1(x) SELECT x+256 FROM t1;
    CREATE TABLE t2(a,b);
    INSERT INTO t2 SELECT x, x*x FROM t1;
  }
  expr {[file size test.db]>1024*12}
} {1}
integrity_check corrupt8-1.2

# Loop through each ptrmap entry.  Corrupt the entry and make sure the
# corruption is detected by the integrity_check.
#
for {set i 1024} {$i<2048} {incr i 5} {
  set oldval [hexio_read test.db $i 1]
  if {$oldval==0} break
  hexio_write test.db $i 00
  do_test corrupt8-2.$i.0 {
    db close
    sqlite3 db test.db
    set x [db eval {PRAGMA integrity_check}]
    expr {$x!="ok"}
  } {1}
  for {set k 1} {$k<=5} {incr k} {
    if {$k==$oldval} continue
    hexio_write test.db $i 0$k
    do_test corrupt8-2.$i.$k {
      db close
      sqlite3 db test.db
      set x [db eval {PRAGMA integrity_check}]
      expr {$x!="ok"}
    } {1}
  }
  hexio_write test.db $i 06
  do_test corrupt8-2.$i.6 {
    db close
    sqlite3 db test.db
    set x [db eval {PRAGMA integrity_check}]
    expr {$x!="ok"}
  } {1}
  hexio_write test.db $i $oldval
  if {$oldval>2} {
    set i2 [expr {$i+1+$i%4}]
    set oldval [hexio_read test.db $i2 1]
    hexio_write test.db $i2 [format %02x [expr {($oldval+1)&0xff}]]
    do_test corrupt8-2.$i.7 {
      db close
      sqlite3 db test.db
      set x [db eval {PRAGMA integrity_check}]
      expr {$x!="ok"}
    } {1}
    hexio_write test.db $i2 $oldval
  }
}


finish_test
