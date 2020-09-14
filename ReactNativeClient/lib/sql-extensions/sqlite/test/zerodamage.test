# 2011 December 21
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
# This file implements tests of the SQLITE_IOCAP_POWERSAFE_OVERWRITE property
# and the SQLITE_FCNTL_POWERSAFE_OVERWRITE file-control for manipulating it.
#
# The name of this file comes from the fact that we used to call the
# POWERSAFE_OVERWRITE property ZERO_DAMAGE.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix zerodamage

ifcapable !vtab {
  finish_test
  return
}

# POWERSAFE_OVERWRITE defaults to true
#
do_test zerodamage-1.0 {
  file_control_powersafe_overwrite db -1
} {0 1}

# Check the ability to turn zero-damage on and off.
#
do_test zerodamage-1.1 {
  file_control_powersafe_overwrite db 0
  file_control_powersafe_overwrite db -1
} {0 0}
do_test zerodamage-1.2 {
  file_control_powersafe_overwrite db 1
  file_control_powersafe_overwrite db -1
} {0 1}

# Run a transaction with zero-damage on, a small page size and a much larger
# sectorsize.  Verify that the maximum journal size is small - that the
# rollback journal is not being padded.
#
do_test zerodamage-2.0 {
  db close
  testvfs tv -default 1
  tv sectorsize 8192
  sqlite3 db file:test.db?psow=TRUE -uri 1
  unset -nocomplain ::max_journal_size
  set ::max_journal_size 0
  proc xDeleteCallback {method file args} {
    set sz [file size $file]
    if {$sz>$::max_journal_size} {set ::max_journal_size $sz}
  }
  tv filter xDelete
  tv script xDeleteCallback
  load_static_extension db wholenumber
  db eval {
    PRAGMA page_size=1024;
    PRAGMA journal_mode=DELETE;
    PRAGMA cache_size=5;
    CREATE VIRTUAL TABLE nums USING wholenumber;
    CREATE TABLE t1(x, y);
    INSERT INTO t1 SELECT value, randomblob(100) FROM nums
                    WHERE value BETWEEN 1 AND 400;
  }
  set ::max_journal_size 0
  db eval {
    UPDATE t1 SET y=randomblob(50) WHERE x=123;
  }
  concat [file_control_powersafe_overwrite db -1] [set ::max_journal_size]
} [list 0 1 [expr ([atomic_batch_write test.db]==0)*2576]]

# Repeat the previous step with zero-damage turned off.  This time the
# maximum rollback journal size should be much larger.
#
do_test zerodamage-2.1 {
  set ::max_journal_size 0
  db close
  sqlite3 db file:test.db?psow=FALSE -uri 1
  db eval {
    UPDATE t1 SET y=randomblob(50) WHERE x=124;
  }
  concat [file_control_powersafe_overwrite db -1] [set ::max_journal_size]
} [list 0 0 [expr ([atomic_batch_write test.db]==0)*24704]]

if {[wal_is_capable]} {
  # Run a WAL-mode transaction with POWERSAFE_OVERWRITE on to verify that the
  # WAL file does not get too big.
  #
  do_test zerodamage-3.0 {
    db eval {
       PRAGMA journal_mode=WAL;
    }
    db close
    sqlite3 db file:test.db?psow=TRUE -uri 1
    db eval {
       UPDATE t1 SET y=randomblob(50) WHERE x=124;
    }
    file size test.db-wal
  } {1080}

  # Repeat the previous with POWERSAFE_OVERWRITE off.  Verify that the WAL file
  # is padded.
  #
  do_test zerodamage-3.1 {
    db close
    sqlite3 db file:test.db?psow=FALSE -uri 1
    db eval {
       PRAGMA synchronous=FULL;
       UPDATE t1 SET y=randomblob(50) WHERE x=124;
    }
    file size test.db-wal
  } {16800}
}

finish_test
