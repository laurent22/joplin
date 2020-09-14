# 2009 January 30
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
# focus of this file is testing the handling of IO errors by the
# sqlite3_backup_XXX APIs.
#
# $Id: backup_ioerr.test,v 1.3 2009/04/10 18:41:01 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc data_checksum {db file} { 
  $db one "SELECT md5sum(a, b) FROM ${file}.t1" 
}
proc test_contents {name db1 file1 db2 file2} {
  $db2 eval {select * from sqlite_master}
  $db1 eval {select * from sqlite_master}
  set checksum [data_checksum $db2 $file2]
  uplevel [list do_test $name [list data_checksum $db1 $file1] $checksum]
}

#--------------------------------------------------------------------
# This proc creates a database of approximately 290 pages. Depending
# on whether or not auto-vacuum is configured. Test cases backup_ioerr-1.*
# verify nothing more than this assumption.
#
proc populate_database {db {xtra_large 0}} {
  execsql {
    BEGIN;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, randstr(1000,1000));
    INSERT INTO t1 SELECT a+ 1, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+ 2, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+ 4, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+ 8, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+16, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+32, randstr(1000,1000) FROM t1;
    CREATE INDEX i1 ON t1(b);
    COMMIT;
  } $db
  if {$xtra_large} {
    execsql { INSERT INTO t1 SELECT a+64, randstr(1000,1000) FROM t1 } $db
  }
}
do_test backup_ioerr-1.1 {
  populate_database db
  set nPage [expr {[file size test.db] / 1024}]
  expr {$nPage>130 && $nPage<160}
} {1}
do_test backup_ioerr-1.2 {
  expr {[file size test.db] > $sqlite_pending_byte}
} {1}
do_test backup_ioerr-1.3 {
  db close
  forcedelete test.db
} {}

# Turn off IO error simulation.
#
proc clear_ioerr_simulation {} {
  set ::sqlite_io_error_hit 0
  set ::sqlite_io_error_hardhit 0
  set ::sqlite_io_error_pending 0
  set ::sqlite_io_error_persist 0
}

#--------------------------------------------------------------------
# The following procedure runs with SQLite's IO error simulation 
# enabled.
#
#   1) Start with a reasonably sized database. One that includes the
#      pending-byte (locking) page.
#
#   2) Open a backup process. Set the cache-size for the destination
#      database to 10 pages only.
#
#   3) Step the backup process N times to partially backup the database
#      file. If an IO error is reported, then the backup process is
#      concluded with a call to backup_finish().
#
#      If an IO error occurs, verify that:
#
#      * the call to backup_step() returns an SQLITE_IOERR_XXX error code.
#
#      * after the failed call to backup_step() but before the call to
#        backup_finish() the destination database handle error code and 
#        error message remain unchanged.
#
#      * the call to backup_finish() returns an SQLITE_IOERR_XXX error code.
#
#      * following the call to backup_finish(), the destination database
#        handle has been populated with an error code and error message.
#
#   4) Write to the database via the source database connection. Check 
#      that:
#
#      * If an IO error occurs while writing the source database, the
#        write operation should report an IO error. The backup should 
#        proceed as normal.
#
#      * If an IO error occurs while updating the backup, the write 
#        operation should proceed normally. The error should be reported
#        from the next call to backup_step() (in step 5 of this test
#        procedure).
#
#   5) Step the backup process to finish the backup. If an IO error is 
#      reported, then the backup process is concluded with a call to 
#      backup_finish().
#
#      Test that if an IO error occurs, or if one occurred while updating
#      the backup database during step 4, then the conditions listed
#      under step 3 are all true.
#
#   6) Finish the backup process.
#
#   * If the backup succeeds (backup_finish() returns SQLITE_OK), then
#     the contents of the backup database should match that of the
#     source database.
#
#   * If the backup fails (backup_finish() returns other than SQLITE_OK), 
#     then the contents of the backup database should be as they were 
#     before the operation was started.
#
# The following factors are varied:
#
#   * Destination database is initially larger than the source database, OR
#   * Destination database is initially smaller than the source database.
#
#   * IO errors are transient, OR
#   * IO errors are persistent.
#
#   * Destination page-size is smaller than the source.
#   * Destination page-size is the same as the source.
#   * Destination page-size is larger than the source.
#

set iTest 1
foreach bPersist {0 1} {
foreach iDestPagesize {512 1024 4096} {
foreach zSetupBak [list "" {populate_database ddb 1}] {

  incr iTest
  set bStop 0
for {set iError 1} {$bStop == 0} {incr iError} {
  # Disable IO error simulation.
  clear_ioerr_simulation

  catch { ddb close }
  catch { sdb close }
  catch { forcedelete test.db }
  catch { forcedelete bak.db }

  # Open the source and destination databases.
  sqlite3 sdb test.db
  sqlite3 ddb bak.db

  # Step 1: Populate the source and destination databases.
  populate_database sdb
  ddb eval "PRAGMA page_size = $iDestPagesize"
  ddb eval "PRAGMA cache_size = 10"
  eval $zSetupBak

  # Step 2: Open the backup process.
  sqlite3_backup B ddb main sdb main

  # Enable IO error simulation.
  set ::sqlite_io_error_pending $iError
  set ::sqlite_io_error_persist $bPersist

  # Step 3: Partially backup the database. If an IO error occurs, check
  # a few things then skip to the next iteration of the loop.
  #
  set rc [B step 100]
  if {$::sqlite_io_error_hardhit} {

    do_test backup_ioerr-$iTest.$iError.1 {
      string match SQLITE_IOERR* $rc
    } {1}
    do_test backup_ioerr-$iTest.$iError.2 {
      list [sqlite3_errcode ddb] [sqlite3_errmsg ddb]
    } {SQLITE_OK {not an error}}

    set rc [B finish]
    do_test backup_ioerr-$iTest.$iError.3 {
      string match SQLITE_IOERR* $rc
    } {1}

    do_test backup_ioerr-$iTest.$iError.4 {
      sqlite3_errmsg ddb
    } {disk I/O error}

    clear_ioerr_simulation
    sqlite3 ddb bak.db
    integrity_check backup_ioerr-$iTest.$iError.5 ddb

    continue
  }

  # No IO error was encountered during step 3. Check that backup_step()
  # returned SQLITE_OK before proceding.
  do_test backup_ioerr-$iTest.$iError.6 {
    expr {$rc eq "SQLITE_OK"}
  } {1}

  # Step 4: Write to the source database.
  set rc [catchsql { UPDATE t1 SET b = randstr(1000,1000) WHERE a < 50 } sdb]

  if {[lindex $rc 0] && $::sqlite_io_error_persist==0} {
    # The IO error occurred while updating the source database. In this
    # case the backup should be able to continue.
    set rc [B step 5000]
    if { $rc != "SQLITE_IOERR_UNLOCK" } {
      do_test backup_ioerr-$iTest.$iError.7 {
        list [B step 5000] [B finish]
      } {SQLITE_DONE SQLITE_OK}

      clear_ioerr_simulation
      test_contents backup_ioerr-$iTest.$iError.8 ddb main sdb main
      integrity_check backup_ioerr-$iTest.$iError.9 ddb
    } else {
      do_test backup_ioerr-$iTest.$iError.10 {
        B finish
      } {SQLITE_IOERR_UNLOCK}
    }

    clear_ioerr_simulation
    sqlite3 ddb bak.db
    integrity_check backup_ioerr-$iTest.$iError.11 ddb

    continue
  }

  # Step 5: Finish the backup operation. If an IO error occurs, check that
  # it is reported correctly and skip to the next iteration of the loop.
  #
  set rc [B step 5000]
  if {$rc != "SQLITE_DONE"} {
    do_test backup_ioerr-$iTest.$iError.12 {
      string match SQLITE_IOERR* $rc
    } {1}
    do_test backup_ioerr-$iTest.$iError.13 {
      list [sqlite3_errcode ddb] [sqlite3_errmsg ddb]
    } {SQLITE_OK {not an error}}

    set rc [B finish]
    do_test backup_ioerr-$iTest.$iError.14 {
      string match SQLITE_IOERR* $rc
    } {1}
    do_test backup_ioerr-$iTest.$iError.15 {
      sqlite3_errmsg ddb
    } {disk I/O error}

    clear_ioerr_simulation
    sqlite3 ddb bak.db
    integrity_check backup_ioerr-$iTest.$iError.16 ddb

    continue
  }

  # The backup was successfully completed.
  #
  do_test backup_ioerr-$iTest.$iError.17 {
    list [set rc] [B finish]
  } {SQLITE_DONE SQLITE_OK}

  clear_ioerr_simulation
  sqlite3 sdb test.db
  sqlite3 ddb bak.db

  test_contents backup_ioerr-$iTest.$iError.18 ddb main sdb main
  integrity_check backup_ioerr-$iTest.$iError.19 ddb

  set bStop [expr $::sqlite_io_error_pending<=0]
}}}}

catch { sdb close }
catch { ddb close }
finish_test
