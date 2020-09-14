# 2014 December 04
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
source $testdir/wal_common.tcl
set testprefix e_walauto

# Do not run this test on OpenBSD, as it depends on read() and mmap both
# accessing the same coherent view of the "test.db-shm" file. This doesn't
# work on OpenBSD.
#
if {$tcl_platform(os) == "OpenBSD"} {
  finish_test
  return
}

# This module uses hard-coded offsets which do not work if the reserved_bytes
# value is nonzero.
if {[nonzero_reserved_bytes]} {finish_test; return;}


proc read_nbackfill {} {
  seek $::shmfd 96
  binary scan [read $::shmfd 4] n nBackfill
  set nBackfill
}
proc read_mxframe {} {
  seek $::shmfd 16
  binary scan [read $::shmfd 4] n mxFrame
  set mxFrame
}

# Assuming that the main db for database handle
#
proc do_autocommit_threshold_test {tn value} {

  set nBackfillSaved [read_nbackfill]
  while {1} {
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    if {[read_mxframe] >= $value} break
  }
  
  set nBackfillNew [read_nbackfill]
  uplevel [list do_test $tn "expr $nBackfillNew > $nBackfillSaved" 1]
}

# EVIDENCE-OF: R-30135-06439 The wal_autocheckpoint pragma can be used
# to invoke this interface from SQL.
#
#   All tests in this file are run twice - once using the
#   sqlite3_wal_autocheckpoint() API, and once using "PRAGMA
#   wal_autocheckpoint".
#
foreach {tn code} {
  1 {
    proc autocheckpoint {db value} {
      uplevel [list $db eval "PRAGMA wal_autocheckpoint = $value"]
    }
  }

  2 {
    proc autocheckpoint {db value} {
      uplevel [list sqlite3_wal_autocheckpoint $db $value]
      return $value
    }
  }
} {

  eval $code

  reset_db
  execsql { PRAGMA auto_vacuum = 0 }
  do_execsql_test 1.$tn.0 { PRAGMA journal_mode = WAL } {wal}
  do_execsql_test 1.$tn.1 { CREATE TABLE t1(a, b) }
  set shmfd [open "test.db-shm" rb]

  # EVIDENCE-OF: R-41531-51083 Every new database connection defaults to
  # having the auto-checkpoint enabled with a threshold of 1000 or
  # SQLITE_DEFAULT_WAL_AUTOCHECKPOINT pages.
  #
  do_autocommit_threshold_test 1.$tn.2 1000
  db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
  do_autocommit_threshold_test 1.$tn.3 1000

  # EVIDENCE-OF: R-38128-34102 The sqlite3_wal_autocheckpoint(D,N) is a
  # wrapper around sqlite3_wal_hook() that causes any database on database
  # connection D to automatically checkpoint after committing a
  # transaction if there are N or more frames in the write-ahead log file.
  #
  do_test 1.$tn.4 {
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    autocheckpoint db 100
  } {100}
  do_autocommit_threshold_test 1.$tn.5 100

  do_test 1.$tn.6 {
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    autocheckpoint db 500
  } {500}
  do_autocommit_threshold_test 1.$tn.7 500

  # EVIDENCE-OF: R-26993-43540 Passing zero or a negative value as the
  # nFrame parameter disables automatic checkpoints entirely.
  #
  do_test 1.$tn.7 {
    autocheckpoint db 0    ;# Set to zero
    for {set i 0} {$i < 10000} {incr i} {
      db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    }
    expr {[file size test.db-wal] > (5 * 1024 * 1024)}
  } 1
  do_test 1.$tn.8 {
    sqlite3_wal_checkpoint_v2 db truncate
    file size test.db-wal
  } 0
  do_test 1.$tn.9 {
    autocheckpoint db -4    ;# Set to a negative value
    for {set i 0} {$i < 10000} {incr i} {
      db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    }
    expr {[file size test.db-wal] > (5 * 1024 * 1024)}
  } 1

  # EVIDENCE-OF: R-10203-42688 The callback registered by this function
  # replaces any existing callback registered using sqlite3_wal_hook().
  #
  set ::wal_hook_callback 0
  proc wal_hook_callback {args} { incr ::wal_hook_callback ; return 0 }
  do_test 1.$tn.10.1 {
    db wal_hook wal_hook_callback
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    set ::wal_hook_callback
  } 2
  do_test 1.$tn.10.2 {
    autocheckpoint db 100
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    set ::wal_hook_callback
  } 2

  # EVIDENCE-OF: R-17497-43474 Likewise, registering a callback using
  # sqlite3_wal_hook() disables the automatic checkpoint mechanism
  # configured by this function.
  do_test 1.$tn.11.1 {
    sqlite3_wal_checkpoint_v2 db truncate
    file size test.db-wal
  } 0
  do_test 1.$tn.11.2 {
    autocheckpoint db 100 
    for {set i 0} {$i < 1000} {incr i} {
      db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    }
    expr {[file size test.db-wal] < (1 * 1024 * 1024)}
  } 1
  do_test 1.$tn.11.3 {
    db wal_hook wal_hook_callback
    for {set i 0} {$i < 1000} {incr i} {
      db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    }
    expr {[file size test.db-wal] < (1 * 1024 * 1024)}
  } 0

  # EVIDENCE-OF: R-33080-59193 Checkpoints initiated by this mechanism 
  # are PASSIVE.
  #
  set ::busy_callback_count 0
  proc busy_callback {args} {
    incr ::busy_callback_count
    return 0
  }
  do_test 1.$tn.12.1 {
    sqlite3_wal_checkpoint_v2 db truncate
    autocheckpoint db 100 
    db busy busy_callback
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
  } {}
  do_test 1.$tn.12.2 {
    sqlite3 db2 test.db
    db2 eval { BEGIN; SELECT * FROM t1 LIMIT 10; }
    read_nbackfill
  } {0}
  do_test 1.$tn.12.3 {
    for {set i 0} {$i < 1000} {incr i} {
      db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    }
    read_nbackfill
  } {2}
  do_test 1.$tn.12.4 {
    set ::busy_callback_count
  } {0}
  db2 close

  do_test 1.$tn.12.5 {
    db eval { INSERT INTO t1 VALUES(randomblob(100), randomblob(100)) }
    read_nbackfill
  } {1559}

  db close
  close $shmfd
}

finish_test
