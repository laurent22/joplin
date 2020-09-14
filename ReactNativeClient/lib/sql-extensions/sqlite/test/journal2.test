# 2010 June 16
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests SQLite when using a VFS that claims the SAFE_DELETE property.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl
db close

if {[permutation] == "inmemory_journal"} {
  finish_test
  return
}

set a_string_counter 1
proc a_string {n} {
  global a_string_counter
  incr a_string_counter
  string range [string repeat "${a_string_counter}." $n] 1 $n
}

# Create a [testvfs] and install it as the default VFS. Set the device
# characteristics flags to "SAFE_DELETE".
#
testvfs tvfs -default 1
tvfs devchar {undeletable_when_open powersafe_overwrite}

# Set up a hook so that each time a journal file is opened, closed or
# deleted, the method name ("xOpen", "xClose" or "xDelete") and the final
# segment of the journal file-name (i.e. "test.db-journal") are appended to
# global list variable $::oplog.
#
tvfs filter {xOpen xClose xDelete}
tvfs script journal_op_catcher
proc journal_op_catcher {method filename args} {

  # If global variable ::tvfs_error_on_write is defined, then return an
  # IO error to every attempt to modify the file-system. Otherwise, return
  # SQLITE_OK.
  #
  if {[info exists ::tvfs_error_on_write]} {
    if {[lsearch {xDelete xWrite xTruncate} $method]>=0} {
      return SQLITE_IOERR 
    }
  }

  # The rest of this command only deals with xOpen(), xClose() and xDelete()
  # operations on journal files. If this invocation does not represent such
  # an operation, return with no further ado.
  #
  set f [file tail $filename]
  if {[string match *journal $f]==0} return
  if {[lsearch {xOpen xDelete xClose} $method]<0} return

  # Append a record of this operation to global list variable $::oplog.
  #
  lappend ::oplog $method $f

  # If this is an attempt to delete a journal file for which there exists
  # one ore more open handles, return an error. The code in test_vfs.c
  # will not invoke the xDelete method of the "real" VFS in this case.
  #
  if {[info exists ::open_journals($f)]==0} { set ::open_journals($f) 0 }
  switch -- $method {
    xOpen   { incr ::open_journals($f) +1 }
    xClose  { incr ::open_journals($f) -1 }
    xDelete { if {$::open_journals($f)>0} { return SQLITE_IOERR } }
  }

  return ""
}


do_test journal2-1.1 {
  set ::oplog [list]
  sqlite3 db test.db
  execsql { CREATE TABLE t1(a, b) }
  set ::oplog
} {xOpen test.db-journal xClose test.db-journal xDelete test.db-journal}
do_test journal2-1.2 {
  set ::oplog [list]
  execsql { 
    PRAGMA journal_mode = truncate;
    INSERT INTO t1 VALUES(1, 2);
  }
  set ::oplog
} {xOpen test.db-journal}
do_test journal2-1.3 {
  set ::oplog [list]
  execsql { INSERT INTO t1 VALUES(3, 4) }
  set ::oplog
} {}
do_test journal2-1.4 { execsql { SELECT * FROM t1 } } {1 2 3 4}

# Add a second connection. This connection attempts to commit data in
# journal_mode=DELETE mode. When it tries to delete the journal file,
# the VFS layer returns an IO error.
#
do_test journal2-1.5 {
  set ::oplog [list]
  sqlite3 db2 test.db
  execsql  { PRAGMA journal_mode = delete } db2
  catchsql { INSERT INTO t1 VALUES(5, 6)  } db2
} {1 {disk I/O error}}
do_test journal2-1.6 { file exists test.db-journal } 1
do_test journal2-1.7 { execsql { SELECT * FROM t1 } } {1 2 3 4}
do_test journal2-1.8 {
  execsql { PRAGMA journal_mode = truncate } db2
  execsql { INSERT INTO t1 VALUES(5, 6)  } db2
} {}
do_test journal2-1.9 { execsql { SELECT * FROM t1 } } {1 2 3 4 5 6}

# Grow the database until it is reasonably large.
#
do_test journal2-1.10 {
  db2 close
  db func a_string a_string
  execsql {
    CREATE TABLE t2(a UNIQUE, b UNIQUE);
    INSERT INTO t2 VALUES(a_string(200), a_string(300));
    INSERT INTO t2 SELECT a_string(200), a_string(300) FROM t2;  --  2
    INSERT INTO t2 SELECT a_string(200), a_string(300) FROM t2;  --  4
    INSERT INTO t2 SELECT a_string(200), a_string(300) FROM t2;  --  8
    INSERT INTO t2 SELECT a_string(200), a_string(300) FROM t2;  -- 16
    INSERT INTO t2 SELECT a_string(200), a_string(300) FROM t2;  -- 32
    INSERT INTO t2 SELECT a_string(200), a_string(300) FROM t2;  -- 64
  }
  file size test.db-journal
} {0}
do_test journal2-1.11 {
  set sz [expr [file size test.db] / 1024]
  expr {$sz>120 && $sz<200}
} 1

# Using new connection [db2] (with journal_mode=DELETE), write a lot of
# data to the database. So that many pages within the database file are
# modified before the transaction is committed.
#
# Then, enable simulated IO errors in all calls to xDelete, xWrite
# and xTruncate before committing the transaction and closing the 
# database file. From the point of view of other file-system users, it
# appears as if the process hosting [db2] unexpectedly exited.
# 
do_test journal2-1.12 {
  sqlite3 db2 test.db
  execsql {
    PRAGMA cache_size = 10;
    BEGIN;
      INSERT INTO t2 SELECT randomblob(200), randomblob(300) FROM t2;  -- 128
  } db2
} {}
do_test journal2-1.13 {
  tvfs filter {xOpen xClose xDelete xWrite xTruncate}
  set ::tvfs_error_on_write 1
  catchsql { COMMIT } db2
} {1 {disk I/O error}}
db2 close
unset ::tvfs_error_on_write
forcecopy test.db testX.db

do_test journal2-1.14 { file exists test.db-journal } 1
do_test journal2-1.15 {
  execsql {
    SELECT count(*) FROM t2;
    PRAGMA integrity_check;
  }
} {64 ok}

# This block checks that in the test case above, connection [db2] really
# did begin writing to the database file before it hit IO errors. If
# this is true, then the copy of the database file made before [db]
# rolled back the hot journal should fail the integrity-check.
#
do_test journal2-1.16 {
  set sz [expr [file size testX.db] / 1024]
  expr {$sz>240 && $sz<400}
} 1
do_test journal2-1.17 {
  expr {[catchsql { PRAGMA integrity_check } db] == "0 ok"}
} {1}
do_test journal2-1.20 {
  sqlite3 db2 testX.db
  expr {[catchsql { PRAGMA integrity_check } db2] == "0 ok"}
} {0}
do_test journal2-1.21 {
  db2 close
} {}
db close

#-------------------------------------------------------------------------
# Test that it is possible to switch from journal_mode=truncate to
# journal_mode=WAL on a SAFE_DELETE file-system. SQLite should close and
# delete the journal file when committing the transaction that switches
# the system to WAL mode.
#
if {[wal_is_capable]} {
  do_test journal2-2.1 {
    faultsim_delete_and_reopen
    set ::oplog [list]
    execsql { PRAGMA journal_mode = persist }
    set ::oplog
  } {}
  do_test journal2-2.2 {
    execsql { 
      CREATE TABLE t1(x);
      INSERT INTO t1 VALUES(3.14159);
    }
    set ::oplog
  } {xOpen test.db-journal}
  do_test journal2-2.3 {
    expr {[file size test.db-journal] > 512}
  } {1}
  do_test journal2-2.4 {
    set ::oplog [list]
    execsql { PRAGMA journal_mode = WAL }
    set ::oplog
  } {xClose test.db-journal xDelete test.db-journal}
  db close
}

tvfs delete
finish_test
