# 2018 July 4
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
source $testdir/lock_common.tcl
source $testdir/wal_common.tcl
ifcapable !wal {finish_test ; return }

set testprefix walprotocol2

#-------------------------------------------------------------------------
# When recovering the contents of a WAL file, a process obtains the WRITER
# lock, then locks all other bytes before commencing recovery. If it fails
# to lock all other bytes (because some other process is holding a read
# lock) it should retry up to 100 times. Then return SQLITE_PROTOCOL to the 
# caller. Test this (test case 1.3).
#
# Also test the effect of hitting an SQLITE_BUSY while attempting to obtain
# the WRITER lock (should be the same). Test case 1.4.
# 
do_execsql_test 1.0 {
  PRAGMA journal_mode = wal;
  CREATE TABLE x(y);
  INSERT INTO x VALUES('z');
} {wal}

db close

proc lock_callback {method filename handle lock} {
  # puts "$method $filename $handle $lock"
}
testvfs T
T filter xShmLock 
T script lock_callback

sqlite3 db  test.db -vfs T
sqlite3 db2 test.db -vfs T

do_execsql_test 2.0 {
  SELECT * FROM x;
} {z}
do_execsql_test -db db2 2.1 {
  SELECT * FROM x;
} {z}

#---------------------------------------------------------------
# Attempt a "BEGIN EXCLUSIVE" using connection handle [db]. This
# causes SQLite to open a read transaction, then a write transaction.
# Rig the xShmLock() callback so that just before the EXCLUSIVE lock
# for the write transaction is taken, connection [db2] jumps in and
# modifies the database. This causes the "BEGIN EXCLUSIVE" to throw
# an SQLITE_BUSY_SNAPSHOT error.
#
proc lock_callback {method filename handle lock} {
  if {$lock=="0 1 lock exclusive"} {
    proc lock_callback {method filename handle lock} {}
    db2 eval { INSERT INTO x VALUES('y') }
  }
}
do_catchsql_test 2.2 {
  BEGIN EXCLUSIVE;
} {1 {database is locked}}
do_test 2.3 {
  sqlite3_extended_errcode db
} {SQLITE_BUSY}

#---------------------------------------------------------------
# Same again, but with a busy-handler. This time, following the
# SQLITE_BUSY_SNAPSHOT error the busy-handler is invoked and then the 
# whole thing retried from the beginning. This time it succeeds.
#
proc lock_callback {method filename handle lock} {
  if {$lock=="0 1 lock exclusive"} {
    proc lock_callback {method filename handle lock} {}
    db2 eval { INSERT INTO x VALUES('x') }
  }
}
db timeout 10
do_catchsql_test 2.4 {
  BEGIN EXCLUSIVE;
} {0 {}}
do_execsql_test 2.5 {
  SELECT * FROM x;
  COMMIT;
} {z y x}

finish_test
