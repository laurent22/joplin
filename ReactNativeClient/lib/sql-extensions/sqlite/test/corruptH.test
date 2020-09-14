# 2014-01-20
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
set testprefix corruptH

# This module uses hard-coded offsets which do not work if the reserved_bytes
# value is nonzero.
if {[nonzero_reserved_bytes]} {finish_test; return;}

database_may_be_corrupt

# The corruption migrations tested by the code in this file are not detected
# mmap mode.
#
# The reason is that in mmap mode, the different queries may use different
# PgHdr objects for the same page (same data, but different PgHdr container 
# objects). And so the corruption is not detected. 
#
if {[permutation]=="mmap"} {
  finish_test
  return
}

# Initialize the database.
#
do_execsql_test 1.1 {
  PRAGMA page_size=1024;

  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  INSERT INTO t1 VALUES(1, 'one');
  INSERT INTO t1 VALUES(2, 'two');

  CREATE TABLE t2(x);
  INSERT INTO t2 VALUES(randomblob(200));
  INSERT INTO t2 SELECT randomblob(200) FROM t2;
  INSERT INTO t2 SELECT randomblob(200) FROM t2;
  INSERT INTO t2 SELECT randomblob(200) FROM t2;
  INSERT INTO t2 SELECT randomblob(200) FROM t2;
  INSERT INTO t2 SELECT randomblob(200) FROM t2;
  INSERT INTO t2 SELECT randomblob(200) FROM t2;
} {}

# Corrupt the file so that the root page of t1 is also linked into t2 as
# a leaf page.
#
do_test 1.2 {
  db eval { SELECT name, rootpage FROM sqlite_master } { 
    set r($name) $rootpage 
  }
  db close
  hexio_write test.db [expr {($r(t2)-1)*1024 + 11}] [format %.2X $r(t1)]
  sqlite3 db test.db
} {}

do_test 1.3 {
  db eval { PRAGMA secure_delete=1 }
  list [catch {
    db eval { SELECT * FROM t1 WHERE a IN (1, 2) } {
      db eval { DELETE FROM t2 }
    }
  } msg] $msg
} {1 {database disk image is malformed}}

#-------------------------------------------------------------------------
reset_db

# Initialize the database.
#
do_execsql_test 2.1 {
  PRAGMA auto_vacuum=0;
  PRAGMA page_size=1024;

  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  INSERT INTO t1 VALUES(1, 'one');
  INSERT INTO t1 VALUES(2, 'two');

  CREATE TABLE t3(x);

  CREATE TABLE t2(x PRIMARY KEY) WITHOUT ROWID;
  INSERT INTO t2 VALUES(randomblob(100));

  DROP TABLE t3;
} {}

do_test 2.2 {
  db eval { SELECT name, rootpage FROM sqlite_master } { 
    set r($name) $rootpage 
  }
  db close
  set fl [hexio_get_int [hexio_read test.db 32 4]]

  hexio_write test.db [expr {($fl-1) * 1024 + 0}] 00000000 
  hexio_write test.db [expr {($fl-1) * 1024 + 4}] 00000001 
  hexio_write test.db [expr {($fl-1) * 1024 + 8}] [format %.8X $r(t1)]
  hexio_write test.db 36 00000002

  sqlite3 db test.db
} {}


# The trick here is that the root page of the tree scanned by the outer 
# query is also currently on the free-list. So while the first seek on
# the table (for a==1) works, by the time the second is attempted The 
# "INSERT INTO t2..." statements have recycled the root page of t1 and
# used it as an index leaf. Normally, BtreeMovetoUnpacked() detects
# that the PgHdr object associated with said root page does not match
# the cursor (as it is now marked with PgHdr.intKey==0) and returns
# SQLITE_CORRUPT. 
#
set res23 {1 {database disk image is malformed}}
do_test 2.3 {
  list [catch {
  set res [list]
  db eval { SELECT * FROM t1 WHERE a IN (1, 2) } {
    db eval { 
      INSERT INTO t2 SELECT randomblob(100) FROM t2;
      INSERT INTO t2 SELECT randomblob(100) FROM t2;
      INSERT INTO t2 SELECT randomblob(100) FROM t2;
      INSERT INTO t2 SELECT randomblob(100) FROM t2;
      INSERT INTO t2 SELECT randomblob(100) FROM t2;
    }
    lappend res $b
  }
  set res
  } msg] $msg
} $res23

#-------------------------------------------------------------------------
reset_db

# Initialize the database.
#
do_execsql_test 3.1 {
  PRAGMA page_size=1024;

  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  INSERT INTO t1 VALUES(1, 'one');
  INSERT INTO t1 VALUES(2, 'two');

  CREATE TABLE t2(c INTEGER PRAGMA KEY, d);
  INSERT INTO t2 VALUES(1, randomblob(1100));
} {}

do_test 3.2 {
  db eval { SELECT name, rootpage FROM sqlite_master } { 
    set r($name) $rootpage 
  }
  db close

  hexio_write test.db [expr {($r(t2)-1) * 1024 + 1020}] 00000002

  sqlite3 db test.db
} {}

do_test 3.3 {
  list [catch {
  db eval { SELECT * FROM t1 WHERE a IN (1, 2) } {
    db eval { 
      DELETE FROM t2 WHERE c=1;
    }
  }
  } msg] $msg
} {1 {database disk image is malformed}}

finish_test
