# 2011 November 16
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
# This file contains fault-injection test cases for the 
# sqlite3_db_cacheflush API.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix cffault
source $testdir/malloc_common.tcl

# Run the supplied SQL on a copy of the database currently stored on 
# disk in file $dbfile.
proc diskquery {dbfile sql} {
  forcecopy $dbfile dq.db
  sqlite3 dq dq.db
  set res [execsql $sql dq]
  dq close
  set res
}

do_execsql_test 1.0 {
  CREATE TABLE t1(a PRIMARY KEY, b);
  CREATE INDEX i1 ON t1(b);
  INSERT INTO t1 VALUES(1, 2);
  INSERT INTO t1 VALUES(3, 4);
  INSERT INTO t1 VALUES(5, 6);
  INSERT INTO t1 VALUES(7, 8);
}
faultsim_save_and_close

do_faultsim_test 1.1 -prep {
  faultsim_restore_and_reopen
  db eval {
    BEGIN;
      UPDATE t1 SET b=b+1;
  }
} -body {
  sqlite3_db_cacheflush db
} -test {
  if {[sqlite3_get_autocommit db]} { error "Transaction rolled back!" }
  faultsim_test_result {0 {}} {1 {disk I/O error}}
  catch { db eval COMMIT }
  faultsim_integrity_check
}

do_faultsim_test 1.2 -prep {
  faultsim_restore_and_reopen
  db eval {
    BEGIN;
      UPDATE t1 SET b=b+1;
  }
} -body {
  set result [list]
  db eval { SELECT * FROM t1 } {
    if {$a==5} { catch { sqlite3_db_cacheflush db } }
    lappend result $a $b
  }
  set result
} -test {
  faultsim_test_result {0 {1 3 3 5 5 7 7 9}} {1 {disk I/O error}}
  catch { db eval COMMIT }
  faultsim_integrity_check
}

#-------------------------------------------------------------------------
reset_db
do_execsql_test 2.0 {
  CREATE TABLE t1(a PRIMARY KEY, b, c);
  CREATE INDEX i1 ON t1(b);
  CREATE INDEX i2 ON t1(c, b);
  INSERT INTO t1 VALUES(1, 2,  randomblob(600));
  INSERT INTO t1 VALUES(3, 4,  randomblob(600));
  INSERT INTO t1 VALUES(5, 6,  randomblob(600));
  INSERT INTO t1 VALUES(7, 8,  randomblob(600));
  INSERT INTO t1 VALUES(9, 10, randomblob(600));
}
faultsim_save_and_close

do_faultsim_test 2.1 -prep {
  faultsim_restore_and_reopen
  db eval {
    BEGIN;
      UPDATE t1 SET b=b+1;
  }
} -body {
  set result [list]
  db eval { SELECT * FROM t1 } {
    if {$a==5} { catch { sqlite3_db_cacheflush db } }
    lappend result $a $b
  }
  set result
} -test {
  faultsim_test_result {0 {1 3 3 5 5 7 7 9 9 11}} {1 {disk I/O error}}
  catch { db eval { INSERT INTO t1 VALUES(11, 12, randomblob(600)) } }
  catch { db eval COMMIT }
  faultsim_integrity_check
}

do_faultsim_test 2.2 -prep {
  faultsim_restore_and_reopen
  db eval {
    BEGIN;
      UPDATE t1 SET b=b+1;
  }
} -body {
  sqlite3_db_cacheflush db
} -test {
  if {[sqlite3_get_autocommit db]} { error "Transaction rolled back!" }
  faultsim_test_result {0 {}} {1 {disk I/O error}}
  catch { db eval { SELECT * FROM t1 } }
  catch { db eval COMMIT }
  faultsim_integrity_check
}

do_faultsim_test 2.3 -prep {
  faultsim_restore_and_reopen
  db eval {
    BEGIN;
      UPDATE t1 SET b=b-1;
  }
} -body {
  sqlite3_db_cacheflush db
} -test {
  if {[sqlite3_get_autocommit db]} { error "Transaction rolled back!" }
  faultsim_test_result {0 {}} {1 {disk I/O error}}
  catch { db eval { INSERT INTO t1 VALUES(11, 12, randomblob(600)) } }
  catch { db eval COMMIT }
  faultsim_integrity_check
}

do_faultsim_test 2.4 -prep {
  faultsim_restore_and_reopen
  db eval {
    BEGIN;
      UPDATE t1 SET b=b-1;
  }
} -body {
  catch { sqlite3_db_cacheflush db }
  catch { sqlite3_db_release_memory db }
  catch { sqlite3_db_cacheflush db }
  execsql { SELECT a, b FROM t1 }
} -test {
  faultsim_test_result {0 {1 1 3 3 5 5 7 7 9 9}} {1 {disk I/O error}}
  catchsql ROLLBACK
  faultsim_integrity_check
}

finish_test
