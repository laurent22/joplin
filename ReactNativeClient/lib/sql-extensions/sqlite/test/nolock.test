# 2014-05-07
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
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the nolock=1 and immutable=1 query
# parameters and the SQLITE_IOCAP_IMMUTABLE device characteristic.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

unset -nocomplain tvfs_calls
proc tvfs_reset {} {
  global tvfs_calls
  array set tvfs_calls {xLock 0 xUnlock 0 xCheckReservedLock 0 xAccess 0}
}
proc tvfs_callback {op args} {
  global tvfs_calls
  incr tvfs_calls($op)
  return SQLITE_OK
}
tvfs_reset

testvfs tvfs
tvfs script tvfs_callback
tvfs filter {xLock xUnlock xCheckReservedLock xAccess}

############################################################################
# Verify that the nolock=1 query parameter for URI filenames disables all
# calls to xLock and xUnlock for rollback databases.
#
do_test nolock-1.0 {
  db close
  forcedelete test.db
  tvfs_reset
  sqlite db test.db -vfs tvfs
  db eval {CREATE TABLE t1(a,b,c); INSERT INTO t1 VALUES(1,2,3);}
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock)
} {xLock 7 xUnlock 5 xCheckReservedLock 0}

do_test nolock-1.1 {
  db close
  forcedelete test.db
  tvfs_reset
  sqlite db file:test.db?nolock=0 -vfs tvfs -uri 1
  db eval {CREATE TABLE t1(a,b,c); INSERT INTO t1 VALUES(1,2,3);}
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock)
} {xLock 7 xUnlock 5 xCheckReservedLock 0}

do_test nolock-1.2 {
  db close
  forcedelete test.db
  tvfs_reset
  sqlite db file:test.db?nolock=1 -vfs tvfs -uri 1
  db eval {CREATE TABLE t1(a,b,c); INSERT INTO t1 VALUES(1,2,3);}
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock)
} {xLock 0 xUnlock 0 xCheckReservedLock 0}

do_test nolock-1.3 {
  db close
  tvfs_reset
  sqlite db file:test.db?nolock=0 -vfs tvfs -uri 1 -readonly 1
  db eval {SELECT * FROM t1}
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock)
} {xLock 2 xUnlock 2 xCheckReservedLock 0}

do_test nolock-1.4 {
  db close
  tvfs_reset
  sqlite db file:test.db?nolock=1 -vfs tvfs -uri 1 -readonly 1
  db eval {SELECT * FROM t1}
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock)
} {xLock 0 xUnlock 0 xCheckReservedLock 0}

#############################################################################
# Verify that immutable=1 disables both locking and xAccess calls to the
# journal files.
#
do_test nolock-2.0 {
  db close
  forcedelete test.db
  # begin by creating a test database
  sqlite3 db test.db
  db eval {
     CREATE TABLE t1(a,b);
     INSERT INTO t1 VALUES('hello','world');
     CREATE TABLE t2(x,y);
     INSERT INTO t2 VALUES(12345,67890);
     SELECT * FROM t1, t2;
  }
} {hello world 12345 67890}
do_test nolock-2.1 {
  tvfs_reset
  sqlite3 db2 test.db -vfs tvfs
  db2 eval {SELECT * FROM t1, t2}
} {hello world 12345 67890}
do_test nolock-2.2 {
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock) \
       xAccess $::tvfs_calls(xAccess)
} {xLock 2 xUnlock 2 xCheckReservedLock 0 xAccess 4}


do_test nolock-2.11 {
  db2 close
  tvfs_reset
  sqlite3 db2 file:test.db?immutable=0 -vfs tvfs -uri 1
  db2 eval {SELECT * FROM t1, t2}
} {hello world 12345 67890}
do_test nolock-2.12 {
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock) \
       xAccess $::tvfs_calls(xAccess)
} {xLock 2 xUnlock 2 xCheckReservedLock 0 xAccess 4}


do_test nolock-2.21 {
  db2 close
  tvfs_reset
  sqlite3 db2 file:test.db?immutable=1 -vfs tvfs -uri 1
  db2 eval {SELECT * FROM t1, t2}
} {hello world 12345 67890}
do_test nolock-2.22 {
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock) \
       xAccess $::tvfs_calls(xAccess)
} {xLock 0 xUnlock 0 xCheckReservedLock 0 xAccess 0}

do_test nolock-2.31 {
  db2 close
  tvfs_reset
  sqlite3 db2 file:test.db?immutable=1 -vfs tvfs -uri 1 -readonly 1
  db2 eval {SELECT * FROM t1, t2}
} {hello world 12345 67890}
do_test nolock-2.32 {
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock) \
       xAccess $::tvfs_calls(xAccess)
} {xLock 0 xUnlock 0 xCheckReservedLock 0 xAccess 0}

############################################################################
# Verify that the SQLITE_IOCAP_IMMUTABLE flag works
#
do_test nolock-3.1 {
  db2 close
  tvfs devchar immutable
  tvfs_reset
  sqlite3 db2 test.db -vfs tvfs
  db2 eval {SELECT * FROM t1, t2}
} {hello world 12345 67890}
do_test nolock-3.2 {
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock) \
       xAccess $::tvfs_calls(xAccess)
} {xLock 0 xUnlock 0 xCheckReservedLock 0 xAccess 0}

do_test nolock-3.11 {
  db2 close
  tvfs_reset
  sqlite3 db2 test.db -vfs tvfs -readonly 1
  db2 eval {SELECT * FROM t1, t2}
} {hello world 12345 67890}
do_test nolock-3.12 {
  list xLock $::tvfs_calls(xLock) xUnlock $::tvfs_calls(xUnlock) \
       xCheckReservedLock $::tvfs_calls(xCheckReservedLock) \
       xAccess $::tvfs_calls(xAccess)
} {xLock 0 xUnlock 0 xCheckReservedLock 0 xAccess 0}

db2 close
db close
tvfs delete

if {[permutation]!="inmemory_journal"} {
  # 2016-03-11:  Make sure all works when transitioning to WAL mode
  # under nolock.
  #
  do_test nolock-4.1 {
    forcedelete test.db
    sqlite3 db file:test.db?nolock=1 -uri 1
    db eval {
       PRAGMA journal_mode=WAL;
       CREATE TABLE t1(x);
       INSERT INTO t1 VALUES('youngling');
       SELECT * FROM t1;
    }
  } {delete youngling}
  db close
  
  do_test nolock-4.2 {
    forcedelete test.db
    sqlite3 db test.db
    db eval {
      PRAGMA journal_mode=WAL;
      CREATE TABLE t1(x);
      INSERT INTO t1 VALUES('catbird');
      SELECT * FROM t1;
    }
  } {wal catbird}
  do_test nolock-4.3 {
    db close
    sqlite3 db file:test.db?nolock=1 -uri 1
    set rc [catch {db eval {SELECT * FROM t1}} msg]
    lappend rc $msg
  } {1 {unable to open database file}}
}

finish_test
