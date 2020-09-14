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
# focus of this file is testing the handling of OOM errors by the
# sqlite3_backup_XXX APIs.
#
# $Id: backup_malloc.test,v 1.2 2009/02/04 22:46:47 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

source $testdir/malloc_common.tcl

do_malloc_test backup_malloc-1 -tclprep {
  execsql {
    PRAGMA cache_size = 10;
    BEGIN;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(1, randstr(1000,1000));
    INSERT INTO t1 SELECT a+ 1, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+ 2, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+ 4, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+ 8, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+16, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+32, randstr(1000,1000) FROM t1;
    INSERT INTO t1 SELECT a+64, randstr(1000,1000) FROM t1;
    CREATE INDEX i1 ON t1(b);
    COMMIT;
  }
  sqlite3 db2 test2.db
  execsql { PRAGMA cache_size = 10 } db2
} -tclbody {

  # Create a backup object.
  #
  set rc [catch {sqlite3_backup B db2 main db main}]
  if {$rc && [sqlite3_errcode db2] == "SQLITE_NOMEM"} {
    error "out of memory"
  }

  # Run the backup process some.
  #
  set rc [B step 50]
  if {$rc == "SQLITE_NOMEM" || $rc == "SQLITE_IOERR_NOMEM"} {
    error "out of memory"
  }
  
  # Update the database.
  #
  execsql { UPDATE t1 SET a = a + 1 }
  
  # Finish doing the backup.
  #
  set rc [B step 5000]
  if {$rc == "SQLITE_NOMEM" || $rc == "SQLITE_IOERR_NOMEM"} {
    error "out of memory"
  }
 
  # Finalize the backup.
  B finish
} -cleanup {
  catch { B finish }
  catch { db2 close }
}

do_malloc_test backup_malloc-2 -tclprep {
  sqlite3 db2 test2.db
} -tclbody {
  set rc [catch {sqlite3_backup B db2 temp db main}]
  set errcode [sqlite3_errcode db2]
  if {$rc && ($errcode == "SQLITE_NOMEM" || $errcode == "SQLITE_IOERR_NOMEM")} {
    error "out of memory"
  }
} -cleanup {
  catch { B finish }
  db2 close
}

reset_db
do_execsql_test 3.0 {
  PRAGMA page_size = 16384;
  BEGIN;
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(1, 2);
  COMMIT;
}

do_faultsim_test 3 -faults oom* -prep {
  catch { db close }
  catch { db2 close }

  forcedelete test2.db
  sqlite3 db2 test2.db
  sqlite3 db test.db
  sqlite3_backup B db2 main db main
} -body {

  set rc [B step 50]
  if {$rc == "SQLITE_NOMEM" || $rc == "SQLITE_IOERR_NOMEM"} {
    error "out of memory"
  }

} -test {
  faultsim_test_result {0 {}} 
  faultsim_integrity_check
  
  # Finalize the backup.
  catch { B finish }
}

finish_test
