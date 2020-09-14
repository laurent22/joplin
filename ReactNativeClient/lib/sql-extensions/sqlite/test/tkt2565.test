# 2009 January 8
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
# This script attempts to reproduce the circumstances of ticket #2565.
#
# More specifically, this script attempts to generate rollback journals
# that contain headers with nRec==0 that are followed by additional
# valid headers.
#
# $Id: tkt2565.test,v 1.2 2009/04/09 01:23:49 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Use the alternative pcache and rig it to call pagerStress()
# very frequently.
#
db close
sqlite3_shutdown
sqlite3_config_alt_pcache 1 100 0 1

# Open two database connections to database "test.db".
#
proc reopen_database {} {
  catch {db close}
  sqlite3 db test.db
  db cache size 0
  execsql {
    pragma page_size=512;
    pragma auto_vacuum=2;
    pragma cache_size=16;
  }
}

# Open two database connections and create a single table in the db.
#
do_test tkt2565-1.0 {
  reopen_database
  execsql { CREATE TABLE A(Id INTEGER, Name TEXT) }
} {}

for {set iFail 1} {$iFail<200} {incr iFail} {
  reopen_database
  execsql { pragma locking_mode=exclusive }
  set nRow [db one {SELECT count(*) FROM a}]
  
  # Dirty (at least) one of the pages in the cache.
  do_test tkt2565-1.$iFail.1 {
    execsql {
      BEGIN EXCLUSIVE;
      INSERT INTO a VALUES(1, 'ABCDEFGHIJKLMNOP');
    }
  } {}
  
  # Now try to commit the transaction. Cause an IO error to occur
  # within this operation, which moves the pager into the error state.
  #
  set ::sqlite_io_error_persist 1
  set ::sqlite_io_error_pending $iFail
  do_test tkt2565-1.$iFail.2 {
    set rc [catchsql {COMMIT}]
    list
  } {}
  set ::sqlite_io_error_persist 0
  set ::sqlite_io_error_pending 0
  if {!$::sqlite_io_error_hit} break
  set ::sqlite_io_error_hit 0
}

# Make sure this test script doesn't leave any files open.
#
do_test tkt2565-1.X {
  catch { db close }
  set sqlite_open_file_count
} 0

# Restore the pcache configuration for subsequent tests.
#
sqlite3_shutdown
sqlite3_config_alt_pcache 0
sqlite3_initialize
autoinstall_test_functions

finish_test
