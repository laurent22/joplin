# 2007 April 2
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
# $Id: ioerr2.test,v 1.12 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !integrityck {
  finish_test
  return
}

do_test ioerr2-1.1 {
  execsql {
    PRAGMA cache_size = 10;
    PRAGMA default_cache_size = 10;
    CREATE TABLE t1(a, b, PRIMARY KEY(a, b));
    INSERT INTO t1 VALUES(randstr(400,400),randstr(400,400));
    INSERT INTO t1 SELECT randstr(400,400), randstr(400,400) FROM t1; -- 2
    INSERT INTO t1 SELECT randstr(400,400), randstr(400,400) FROM t1; -- 4
    INSERT INTO t1 SELECT randstr(400,400), randstr(400,400) FROM t1; -- 8
    INSERT INTO t1 SELECT randstr(400,400), randstr(400,400) FROM t1; -- 16
    INSERT INTO t1 SELECT randstr(400,400), randstr(400,400) FROM t1; -- 32
  }
} {}

set ::cksum [execsql {SELECT md5sum(a, b) FROM t1}]
proc check_db {testname} {

  # Make sure no I/O errors are simulated in this proc.
  set ::sqlite_io_error_hit 0
  set ::sqlite_io_error_persist 0
  set ::sqlite_io_error_pending 0

  # Run an integrity-check. If "disk I/O error" is returned, the
  # pager must be in error state. In this case open a new database
  # connection. Otherwise, try a ROLLBACK, in case a transaction 
  # is still active.
  set rc [catch {execsql {PRAGMA integrity_check}} msg]
  if {$rc && ($msg eq "disk I/O error" || $msg eq "database is locked")} {
    db close
    sqlite3 db test.db
    set refcnt 0
  } else {
    if {$rc || $msg ne "ok"} {
      error $msg
    }
    catch {execsql ROLLBACK}
  }

  # Check that the database checksum is still $::cksum, and that
  # the integrity-check passes.
  set ck [execsql {SELECT md5sum(a, b) FROM t1}]
  do_test ${testname}.cksum [list set ck $ck] $::cksum
  integrity_check ${testname}.integrity
  do_test ${testname}.refcnt {
    lindex [sqlite3_pager_refcounts db] 0
  } 0
}

check_db ioerr2-2

set sql {
  PRAGMA cache_size = 10;
  PRAGMA default_cache_size = 10;
  BEGIN;
  DELETE FROM t1 WHERE (oid%7)==0;
  INSERT INTO t1 SELECT randstr(400,400), randstr(400,400) 
    WHERE (random()%7)==0;
  UPDATE t1 SET a = randstr(400,400), b = randstr(400,400) 
    WHERE (random()%7)==0;
  ROLLBACK;
}

foreach bPersist [list 0 1] {
  set ::go 1
  for {set ::N 1} {$::go} {incr ::N} {
    db close
    sqlite3 db test.db
    set ::sqlite_io_error_hit 0
    set ::sqlite_io_error_persist $bPersist
    set ::sqlite_io_error_pending $::N

    foreach {::go res} [catchsql $sql] {}
    check_db ioerr2-3.$bPersist.$::N
  }
}
foreach bPersist [list 0 1] {
  set ::go 1
  for {set ::N 1} {$::go} {incr ::N} {
    set ::sqlite_io_error_hit 0
    set ::sqlite_io_error_persist $bPersist
    set ::sqlite_io_error_pending $::N

    foreach {::go res} [catchsql $sql] {}
    check_db ioerr2-4.[expr {$bPersist+2}].$::N
  }
}

# When this test was written, an IO error within the UPDATE statement caused
# a rollback, which tripped all read-cursors, causing the outer SELECT to
# fail with "abort due to ROLLBACK". Now, the loop continues until the UPDATE
# is run successfully. At this point the next IO error occurs within the 
# SELECT - throwing the "disk I/O error" that the test case now expects.
#
do_test ioerr2-5 {
  execsql {
    CREATE TABLE t2 AS SELECT * FROM t1;
    PRAGMA temp_store = memory;
  }
  set ::sqlite_io_error_persist 0
  set ::go 1
  set rc [catch {
    for {set ::N 2} {$::N<200} {incr ::N} {
      db eval {SELECT * FROM t1 WHERE rowid IN (1, 5, 10, 15, 20)} {
        set ::sqlite_io_error_hit 0
        set ::sqlite_io_error_pending $::N
        set sql {UPDATE t2 SET b = randstr(400,400)}
        foreach {::go res} [catchsql $sql] {}
      }
    }
  } msg]
  list $rc $msg
} {1 {disk I/O error}} ;# used to be "{1 {abort due to ROLLBACK}}"

if {$::tcl_platform(platform) == "unix"} {
  # Cause the call to xAccess used by [pragma temp_store_directory] to
  # determine if the specified directory is writable to fail. This causes
  # SQLite to report "not a writable directory", which is probably the
  # right answer.
  #
  do_test ioerr2-6 {
    set ::sqlite_io_error_hit 0
    set ::sqlite_io_error_pending 1
    catchsql {PRAGMA temp_store_directory = '/tmp/'}
  } {1 {not a writable directory}}
}

do_ioerr_test ioerr2-7 -persist 0 -sqlprep {
  PRAGMA cache_size = 10;
  PRAGMA auto_vacuum = 1;
  CREATE TABLE ab(a, b);
  CREATE TABLE de(d, e);
  INSERT INTO ab VALUES(1, randstr(200,200));
  INSERT INTO ab SELECT a+1, randstr(200,200) FROM ab;
  INSERT INTO ab SELECT a+2, randstr(200,200) FROM ab;
  INSERT INTO ab SELECT a+4, randstr(200,200) FROM ab;
  INSERT INTO ab SELECT a+8, randstr(200,200) FROM ab;
  INSERT INTO ab SELECT a+16, randstr(200,200) FROM ab;
  INSERT INTO ab SELECT a+32, randstr(200,200) FROM ab;
  INSERT INTO ab SELECT a+64, randstr(200,200) FROM ab;
  INSERT INTO de SELECT * FROM ab;
} -sqlbody {
  BEGIN;
  UPDATE ab SET b = randstr(200,200);
  UPDATE de SET e = randstr(200,200) WHERE d = (SELECT max(d) FROM de);
  DELETE FROM ab;
  COMMIT;
}

finish_test
