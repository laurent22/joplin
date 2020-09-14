# 2016 February 4
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
# focus of this file is testing the operation of the library in
# "PRAGMA journal_mode=WAL" mode.
#
# More specifically, it tests "locking protocol" errors - errors that
# may be caused if one or more SQLite clients does not follow the expected
# locking protocol when accessing a wal-mode database. These tests take
# quite a while to run.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/wal_common.tcl
ifcapable !wal {finish_test ; return }

set testprefix walprotocol

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

proc lock_callback {method filename handle lock} {
  lappend ::locks $lock
}
do_test 1.1 {
  testvfs T
  T filter xShmLock 
  T script lock_callback
  set ::locks [list]
  sqlite3 db test.db -vfs T
  execsql { SELECT * FROM x }
  lrange $::locks 0 11
} [list {0 1 lock exclusive} {1 2 lock exclusive}     \
        {4 1 lock exclusive} {4 1 unlock exclusive}   \
        {5 1 lock exclusive} {5 1 unlock exclusive}   \
        {6 1 lock exclusive} {6 1 unlock exclusive}   \
        {7 1 lock exclusive} {7 1 unlock exclusive}   \
        {1 2 unlock exclusive}   \
        {0 1 unlock exclusive}  \
]
do_test 1.2 {
  db close
  set ::locks [list]
  sqlite3 db test.db -vfs T
  execsql { SELECT * FROM x }
  lrange $::locks 0 11
} [list {0 1 lock exclusive} {1 2 lock exclusive}     \
        {4 1 lock exclusive} {4 1 unlock exclusive}   \
        {5 1 lock exclusive} {5 1 unlock exclusive}   \
        {6 1 lock exclusive} {6 1 unlock exclusive}   \
        {7 1 lock exclusive} {7 1 unlock exclusive}   \
        {1 2 unlock exclusive}   \
        {0 1 unlock exclusive}  \
]
proc lock_callback {method filename handle lock} {
  if {$lock == "1 2 lock exclusive"} { return SQLITE_BUSY }
  return SQLITE_OK
}
puts "# Warning: This next test case causes SQLite to call xSleep(1) 100 times."
puts "# Normally this equates to a delay of roughly 10 seconds, but if SQLite"
puts "# is built on unix without HAVE_USLEEP defined, it may be much longer."
do_test 1.3 {
  db close
  set ::locks [list]
  sqlite3 db test.db -vfs T
  catchsql { SELECT * FROM x }
} {1 {locking protocol}}

puts "# Warning: Same again!"
proc lock_callback {method filename handle lock} {
  if {$lock == "0 1 lock exclusive"} { return SQLITE_BUSY }
  return SQLITE_OK
}
do_test 1.4 {
  db close
  set ::locks [list]
  sqlite3 db test.db -vfs T
  catchsql { SELECT * FROM x }
} {1 {locking protocol}}

puts "# Warning: Third time!"
proc lock_callback {method filename handle lock} {
  if {$lock == "4 4 lock exclusive"} { return SQLITE_BUSY }
  return SQLITE_OK
}
do_test 1.5 {
  db close
  set ::locks [list]
  sqlite3 db test.db -vfs T
  catchsql { SELECT * FROM x }
} {0 z}
db close
T delete

#-------------------------------------------------------------------------
# 
do_test 2.1 {
  forcedelete test.db test.db-journal test.db wal
  sqlite3 db test.db
  sqlite3 db2 test.db
  execsql {
    PRAGMA auto_vacuum = off;
    PRAGMA journal_mode = WAL;
    CREATE TABLE b(c);
    INSERT INTO b VALUES('Tehran');
    INSERT INTO b VALUES('Qom');
    INSERT INTO b VALUES('Markazi');
    PRAGMA wal_checkpoint;
  }
} {wal 0 5 5}
do_test 2.2 {
  execsql { SELECT * FROM b }
} {Tehran Qom Markazi}
do_test 2.3 {
  db eval { SELECT * FROM b } {
    db eval { INSERT INTO b VALUES('Qazvin') }
    set r [db2 eval { SELECT * FROM b }]
    break
  }
  set r
} {Tehran Qom Markazi Qazvin}
do_test 2.4 {
  execsql {
    INSERT INTO b VALUES('Gilan');
    INSERT INTO b VALUES('Ardabil');
  }
} {}
db2 close

faultsim_save_and_close
testvfs T -default 1
faultsim_restore_and_reopen
T filter xShmLock
T script lock_callback

proc lock_callback {method file handle spec} {
  if {$spec == "1 2 unlock exclusive"} {
    T filter {}
    set ::r [catchsql { SELECT * FROM b } db2]
  }
}
sqlite3 db test.db
sqlite3 db2 test.db
puts "# Warning: Another slow test!"
do_test 2.5 {
  execsql { SELECT * FROM b }
} {Tehran Qom Markazi Qazvin Gilan Ardabil}
do_test 2.6 {
  set ::r
} {0 {Tehran Qom Markazi Qazvin Gilan Ardabil}}

db close
db2 close

faultsim_restore_and_reopen
sqlite3 db2 test.db
T filter xShmLock
T script lock_callback
proc lock_callback {method file handle spec} {
  if {$spec == "1 2 unlock exclusive"} {
    T filter {}
    set ::r [catchsql { SELECT * FROM b } db2]
  }
}
unset ::r
puts "# Warning: Last one!"
do_test 2.7 {
  execsql { SELECT * FROM b }
} {Tehran Qom Markazi Qazvin Gilan Ardabil}
do_test 2.8 {
  set ::r
} {0 {Tehran Qom Markazi Qazvin Gilan Ardabil}}

db close
db2 close
T delete

finish_test
