# 2007 June 13
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to verify that ticket #2409 has been
# fixed. More specifically, they verify that if SQLite cannot
# obtain an EXCLUSIVE lock while trying to spill the cache during
# any statement other than a COMMIT, an I/O error is returned instead
# of SQLITE_BUSY.
#
# $Id: tkt2409.test,v 1.6 2008/08/28 17:46:19 drh Exp $

# Test Outline:
#
#   tkt-2409-1.*: Cause a cache-spill during an INSERT that is within
#       a db transaction but does not start a statement transaction.
#       Verify that the transaction is automatically rolled back
#       and SQLITE_IOERR_BLOCKED is returned
#
#       UPDATE: As of the pcache modifications, failing to upgrade to
#       an exclusive lock when attempting a cache-spill is no longer an
#       error. The pcache module allocates more space and keeps working
#       in memory if this occurs.
#
#   tkt-2409-2.*: Cause a cache-spill while updating the change-counter
#       during a database COMMIT. Verify that the transaction is not
#       rolled back and SQLITE_BUSY is returned.
#
#   tkt-2409-3.*: Similar to 2409-1.*, but using many INSERT statements
#       within a transaction instead of just one.
#
#       UPDATE: Again, pcache now just keeps working in main memory.
#
#   tkt-2409-4.*: Similar to 2409-1.*, but rig it so that the
#       INSERT statement starts a statement transaction. Verify that
#       SQLITE_BUSY is returned and the transaction is not rolled back.
#
#       UPDATE: This time, SQLITE_BUSY is not returned. pcache just uses
#       more malloc()'d memory.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !pager_pragmas {
  finish_test
  return
}

sqlite3_extended_result_codes $::DB 1

# Aquire a read-lock on the database using handle [db2].
#
proc read_lock_db {} {
  if {$::STMT eq ""} {
    set ::STMT [sqlite3_prepare db2 {SELECT rowid FROM sqlite_master} -1 TAIL]
    set rc [sqlite3_step $::STMT]
    if {$rc eq "SQLITE_ERROR"} {
      unread_lock_db
      read_lock_db
    }
  }
}

# Release any read-lock obtained using [read_lock_db]
#
proc unread_lock_db {} {
  if {$::STMT ne ""} {
    sqlite3_finalize $::STMT
    set ::STMT ""
  }
}

# Open the db handle used by [read_lock_db].
#
sqlite3 db2 test.db
set ::STMT ""

do_test tkt2409-1.1 {
  execsql {
    PRAGMA cache_size=10;
    CREATE TABLE t1(x TEXT UNIQUE NOT NULL, y BLOB);
  }
  read_lock_db
  set ::zShort [string repeat 0123456789 1]
  set ::zLong  [string repeat 0123456789 1500]
  catchsql {
    BEGIN;
    INSERT INTO t1 VALUES($::zShort, $::zLong);
  }
} {0 {}}

do_test tkt2409-1.2 {
  sqlite3_errcode $::DB
} {SQLITE_OK}

# Check the integrity of the cache.
#
integrity_check tkt2409-1.3

# Check that the transaction was rolled back. Because the INSERT
# statement in which the "I/O error" occurred did not open a statement
# transaction, SQLite had no choice but to roll back the transaction.
#
do_test tkt2409-1.4 {
  unread_lock_db
  catchsql { ROLLBACK }
} {0 {}}

set ::zShort [string repeat 0123456789 1]
set ::zLong  [string repeat 0123456789 1500]
set ::rc 1
for {set iCache 10} {$::rc} {incr iCache} {
  execsql "PRAGMA cache_size = $iCache"
  do_test tkt2409-2.1.$iCache {
    read_lock_db
    set ::rc [catch {
      execsql {
        BEGIN;
        INSERT INTO t1 VALUES($::zShort, $::zLong);
      }
    } msg]
    expr {($::rc == 1 && $msg eq "disk I/O error") || $::rc == 0}
  } {1}
}

do_test tkt2409-2.2 {
  catchsql {
    ROLLBACK;
    BEGIN;
    INSERT INTO t1 VALUES($::zShort, $::zLong);
    COMMIT;
  }
} {1 {database is locked}}

do_test tkt2409-2.3 {
  unread_lock_db
  catchsql {
    COMMIT;
  }
} {0 {}}


do_test tkt2409-3.1 {
  db close
  set ::DB [sqlite3 db test.db; sqlite3_connection_pointer db]
  sqlite3_extended_result_codes $::DB 1
  execsql {
    PRAGMA cache_size=10;
    DELETE FROM t1;
  }
  read_lock_db
  set ::zShort [string repeat 0123456789 1]
  set ::zLong  [string repeat 0123456789 1500]
  catchsql {
    BEGIN;
    INSERT INTO t1 SELECT $::zShort, $::zLong;
  }
} {0 {}}

do_test tkt2409-3.2 {
  sqlite3_errcode $::DB
} {SQLITE_OK}

# Check the integrity of the cache.
#
integrity_check tkt2409-3.3

# Check that the transaction was rolled back. Because the INSERT
# statement in which the "I/O error" occurred did not open a statement
# transaction, SQLite had no choice but to roll back the transaction.
#
do_test tkt2409-3.4 {
  unread_lock_db
  catchsql { ROLLBACK }
} {0 {}}
integrity_check tkt2409-3.5

expr {srand(1)}
do_test tkt2409-4.1 {
  execsql {
    PRAGMA cache_size=20;
    DROP TABLE t1;
    CREATE TABLE t1 (x TEXT UNIQUE NOT NULL);
  }

  unset -nocomplain t1
  array unset t1
  set t1(0) 1
  set sql ""
  for {set i 0} {$i<5000} {incr i} {
    set r 0
    while {[info exists t1($r)]} {
      set r [expr {int(rand()*1000000000)}]
    }
    set t1($r) 1
    append sql "INSERT INTO t1 VALUES('some-text-$r');"
  }

  read_lock_db
  execsql BEGIN
  catchsql $sql
} {0 {}}

do_test tkt2409-4.2 {
  sqlite3_errcode $::DB
} {SQLITE_OK}

# Check the integrity of the cache.
#
integrity_check tkt2409-4.3

do_test tkt2409-4.4 {
  catchsql { ROLLBACK }
} {0 {}}
integrity_check tkt2409-4.5

unread_lock_db
db2 close
unset -nocomplain t1
finish_test
