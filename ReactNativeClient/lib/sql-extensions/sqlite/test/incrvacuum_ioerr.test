# 2001 October 12
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
# focus of this file is testing for correct handling of I/O errors
# such as writes failing because the disk is full.
# 
# The tests in this file use special facilities that are only
# available in the SQLite test fixture.
#
# $Id: incrvacuum_ioerr.test,v 1.6 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If this build of the library does not support auto-vacuum, omit this
# whole file.
ifcapable {!autovacuum} {
  finish_test
  return
}

do_ioerr_test incrvacuum-ioerr-1 -cksum 1 -sqlprep {
  PRAGMA auto_vacuum = 'incremental';
  CREATE TABLE abc(a);
  INSERT INTO abc VALUES(randstr(1500,1500));
} -sqlbody {
  BEGIN;
  CREATE TABLE abc2(a);
  DELETE FROM abc;
  PRAGMA incremental_vacuum;
  COMMIT;
} 

# do_ioerr_test incrvacuum-ioerr-3 -start 1 -cksum 1 -tclprep {
#   db eval {
#     PRAGMA auto_vacuum = 'full';
#     PRAGMA cache_size = 10;
#     BEGIN;
#     CREATE TABLE abc(a, UNIQUE(a));
#   }
#   for {set ii 0} {$ii < 25} {incr ii} {
#     db eval {INSERT INTO abc VALUES(randstr(1500,1500))}
#   }
#   db eval COMMIT
# } -sqlbody {
#   BEGIN;
#   DELETE FROM abc WHERE (oid%3)==0;
#   INSERT INTO abc SELECT a || '1234567890' FROM abc WHERE oid%2;
#   CREATE INDEX abc_i ON abc(a);
#   DELETE FROM abc WHERE (oid%2)==0;
#   DROP INDEX abc_i;
#   COMMIT;
# }

do_ioerr_test incrvacuum-ioerr-2 -start 1 -cksum 1 -tclprep {
  db eval {
    PRAGMA auto_vacuum = 'full';
    PRAGMA cache_size = 10;
    BEGIN;
    CREATE TABLE abc(a, UNIQUE(a));
  }
  for {set ii 0} {$ii < 25} {incr ii} {
    db eval {INSERT INTO abc VALUES(randstr(1500,1500))}
  }
  db eval COMMIT
} -sqlbody {
  BEGIN;
  PRAGMA incremental_vacuum;
  DELETE FROM abc WHERE (oid%3)==0;
  PRAGMA incremental_vacuum;
  INSERT INTO abc SELECT a || '1234567890' FROM abc WHERE oid%2;
  PRAGMA incremental_vacuum;
  CREATE INDEX abc_i ON abc(a);
  DELETE FROM abc WHERE (oid%2)==0;
  PRAGMA incremental_vacuum;
  DROP INDEX abc_i;
  PRAGMA incremental_vacuum;
  COMMIT;
}

do_ioerr_test incrvacuum-ioerr-3 -start 1 -cksum 1 -tclprep {
  db eval {
    PRAGMA auto_vacuum = 'incremental';
    BEGIN;
    CREATE TABLE a(i integer, b blob);
    INSERT INTO a VALUES(1, randstr(1500,1500));
    INSERT INTO a VALUES(2, randstr(1500,1500));
  }
  db eval COMMIT
  db eval {DELETE FROM a WHERE oid}
} -sqlbody {
  PRAGMA incremental_vacuum(5);
} -cleanup {
  sqlite3 db test.db
  integrity_check incrvacuum-ioerr-2.$n.integritycheck
  db close
}


ifcapable shared_cache {

  catch { db close }
  forcedelete test.db
  set ::enable_shared_cache [sqlite3_enable_shared_cache 1]
  
  # Create two connections to a single shared-cache:
  #
  sqlite3 db1 test.db
  sqlite3 db2 test.db
  
  # Create a database with around 20 free pages.
  #
  do_test incrvacuum-ioerr-4.0 {
    execsql {
      PRAGMA page_size = 1024;
      PRAGMA locking_mode = exclusive;
      PRAGMA auto_vacuum = 'incremental';
      BEGIN;
      CREATE TABLE a(i integer, b blob);
    } db1
    for {set ii 0} {$ii < 20} {incr ii} {
      execsql { INSERT INTO a VALUES($ii, randstr(800,1500)); } db1
    }
    execsql COMMIT db1
    execsql {DELETE FROM a WHERE oid} db1
  } {}
  
  set ::rc 1
  for {set iTest 1} {$::rc && $iTest<2000} {incr iTest} {
  
    # Figure out how big the database is and how many free pages it
    # has before running incremental-vacuum.
    #
    set nFree [execsql {pragma freelist_count} db1]
    set nPage [execsql {pragma page_count} db1]
    puts "nFree=$nFree nPage=$nPage"
  
    # Now run incremental-vacuum to vacuum 5 pages from the db file.
    # The iTest'th I/O call is set to fail.
    #
    set ::sqlite_io_error_pending $iTest
    set ::sqlite_io_error_persist 1
    do_test incrvacuum-ioerr-4.$iTest.1 {
      set ::rc [catch {execsql {pragma incremental_vacuum(5)} db1} msg]
      expr {$::rc==0 || $msg eq "disk I/O error"}
    } {1}
  
    set ::sqlite_io_error_pending 0
    set ::sqlite_io_error_persist 0
    set ::sqlite_io_error_hit 0
    set ::sqlite_io_error_hardhit 0
  
    set nFree2 [execsql {pragma freelist_count} db1]
    set nPage2 [execsql {pragma page_count} db1]
  
    do_test incrvacuum-ioerr-4.$iTest.2 {
      set shrink [expr {$nPage-$nPage2}]
      expr {$shrink==0 || $shrink==5 || ($nFree<5 && $shrink==$nFree)}
    } {1}
  
    do_test incrvacuum-ioerr-4.$iTest.3 {
      expr {$nPage - $nPage2}
    } [expr {$nFree - $nFree2}]
  }
  
  # Close the two database connections and restore the default
  # shared-cache mode setting.
  #
  db1 close
  db2 close
  sqlite3_enable_shared_cache $::enable_shared_cache
}

finish_test
