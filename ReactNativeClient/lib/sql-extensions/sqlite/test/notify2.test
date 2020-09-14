# 2009 March 04
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
# $Id: notify2.test,v 1.7 2009/03/30 11:59:31 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
if {[run_thread_tests]==0} { finish_test ; return }
ifcapable !unlock_notify||!shared_cache { finish_test ; return }

# The tests in this file test the sqlite3_blocking_step() function in
# test_thread.c. sqlite3_blocking_step() is not an SQLite API function,
# it is just a demonstration of how the sqlite3_unlock_notify() function
# can be used to synchronize multi-threaded access to SQLite databases
# in shared-cache mode.
#
# Since the implementation of sqlite3_blocking_step() is included on the
# website as example code, it is important to test that it works.
#
# notify2-1.*:
#
#   This test uses $nThread threads. Each thread opens the main database
#   and attaches two other databases. Each database contains a single table.
#
#   Each thread repeats transactions over and over for 20 seconds. Each
#   transaction consists of 3 operations. Each operation is either a read
#   or a write of one of the tables. The read operations verify an invariant
#   to make sure that things are working as expected. If an SQLITE_LOCKED
#   error is returned the current transaction is rolled back immediately.
#
#   This exercise is repeated twice, once using sqlite3_step(), and the
#   other using sqlite3_blocking_step(). The results are compared to ensure
#   that sqlite3_blocking_step() resulted in higher transaction throughput.
#

db close
set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

# Number of threads to run simultaneously.
#
set nThread 6
set nSecond 5

# The Tcl script executed by each of the $nThread threads used by this test.
#
set ThreadProgram {

  # Proc used by threads to execute SQL.
  #
  proc execsql_blocking {db zSql} {
    set lRes [list]
    set rc SQLITE_OK

set sql $zSql

    while {$rc=="SQLITE_OK" && $zSql ne ""} {
      set STMT [$::xPrepare $db $zSql -1 zSql]
      while {[set rc [$::xStep $STMT]] eq "SQLITE_ROW"} {
        for {set i 0} {$i < [sqlite3_column_count $STMT]} {incr i} {
          lappend lRes [sqlite3_column_text $STMT 0]
        }
      }
      set rc [sqlite3_finalize $STMT]
    }

    if {$rc != "SQLITE_OK"} { error "$rc $sql [sqlite3_errmsg $db]" }
    return $lRes
  }

  proc execsql_retry {db sql} { 
    set msg "SQLITE_LOCKED blah..."
    while { [string match SQLITE_LOCKED* $msg] } {
      catch { execsql_blocking $db $sql } msg
    }
  }

  proc select_one {args} {
    set n [llength $args]
    lindex $args [expr int($n*rand())]
  }

  proc opendb {} {
    # Open a database connection. Attach the two auxillary databases.
    set ::DB [sqlite3_open test.db]
    execsql_retry $::DB { ATTACH 'test2.db' AS aux2; }
    execsql_retry $::DB { ATTACH 'test3.db' AS aux3; }
  }

  opendb

  #after 2000

  # This loop runs for ~20 seconds.
  #
  set iStart [clock_seconds]
  set nOp 0
  set nAttempt 0
  while { ([clock_seconds]-$iStart) < $nSecond } {

    # Each transaction does 3 operations. Each operation is either a read
    # or write of a randomly selected table (t1, t2 or t3). Set the variables
    # $SQL(1), $SQL(2) and $SQL(3) to the SQL commands used to implement
    # each operation.
    #
    for {set ii 1} {$ii <= 3} {incr ii} {
      foreach {tbl database} [select_one {t1 main} {t2 aux2} {t3 aux3}] {}

      set SQL($ii) [string map [list xxx $tbl yyy $database] [select_one {
            SELECT 
              (SELECT b FROM xxx WHERE a=(SELECT max(a) FROM xxx))==total(a) 
              FROM xxx WHERE a!=(SELECT max(a) FROM xxx);
      } {
            DELETE FROM xxx WHERE a<(SELECT max(a)-100 FROM xxx);
            INSERT INTO xxx SELECT NULL, total(a) FROM xxx;
      } {
            CREATE INDEX IF NOT EXISTS yyy.xxx_i ON xxx(b);
      } {
            DROP INDEX IF EXISTS yyy.xxx_i;
      }
      ]]
    }

    # Execute the SQL transaction.
    #
    incr nAttempt
    set rc [catch { execsql_blocking $::DB "
        BEGIN;
          $SQL(1);
          $SQL(2);
          $SQL(3);
        COMMIT;
      "
    } msg]

    if {$rc && [string match "SQLITE_LOCKED*" $msg]
            || [string match "SQLITE_SCHEMA*" $msg]
    } {
      # Hit an SQLITE_LOCKED error. Rollback the current transaction.
      set rc [catch { execsql_blocking $::DB ROLLBACK } msg]
      if {$rc && [string match "SQLITE_LOCKED*" $msg]} {
        sqlite3_close $::DB
        opendb
      } 
    } elseif {$rc} {
      # Hit some other kind of error. This is a malfunction.
      error $msg
    } else {
      # No error occurred. Check that any SELECT statements in the transaction
      # returned "1". Otherwise, the invariant was false, indicating that
      # some malfunction has occurred.
      foreach r $msg { if {$r != 1} { puts "Invariant check failed: $msg" } }
      incr nOp
    }
  }

  # Close the database connection and return 0.
  #
  sqlite3_close $::DB
  list $nOp $nAttempt
}

foreach {iTest xStep xPrepare} {
  1 sqlite3_blocking_step sqlite3_blocking_prepare_v2
  2 sqlite3_step          sqlite3_nonblocking_prepare_v2
} {
  forcedelete test.db test2.db test3.db

  set ThreadSetup "set xStep $xStep;set xPrepare $xPrepare;set nSecond $nSecond"

  # Set up the database schema used by this test. Each thread opens file
  # test.db as the main database, then attaches files test2.db and test3.db
  # as auxillary databases. Each file contains a single table (t1, t2 and t3, in
  # files test.db, test2.db and test3.db, respectively). 
  #
  do_test notify2-$iTest.1.1 {
    sqlite3 db test.db
    execsql {
      ATTACH 'test2.db' AS aux2;
      ATTACH 'test3.db' AS aux3;
      CREATE TABLE main.t1(a INTEGER PRIMARY KEY, b);
      CREATE TABLE aux2.t2(a INTEGER PRIMARY KEY, b);
      CREATE TABLE aux3.t3(a INTEGER PRIMARY KEY, b);
      INSERT INTO t1 SELECT NULL, 0;
      INSERT INTO t2 SELECT NULL, 0;
      INSERT INTO t3 SELECT NULL, 0;
    }
  } {}
  do_test notify2-$iTest.1.2 {
    db close
  } {}


  # Launch $nThread threads. Then wait for them to finish.
  #
  puts "Running $xStep test for $nSecond seconds"
  unset -nocomplain finished
  for {set ii 0} {$ii < $nThread} {incr ii} {
    thread_spawn finished($ii) $ThreadSetup $ThreadProgram
  }
  for {set ii 0} {$ii < $nThread} {incr ii} {
    do_test notify2-$iTest.2.$ii {
      if {![info exists finished($ii)]} { vwait finished($ii) }
      incr anSuccess($xStep) [lindex $finished($ii) 0]
      incr anAttempt($xStep) [lindex $finished($ii) 1]
      expr 0
    } {0}
  }

  # Count the total number of succesful writes.
  do_test notify2-$iTest.3.1 {
    sqlite3 db test.db
    execsql {
      ATTACH 'test2.db' AS aux2;
      ATTACH 'test3.db' AS aux3;
    }
    set anWrite($xStep) [execsql {
      SELECT (SELECT max(a) FROM t1)
           + (SELECT max(a) FROM t2)
           + (SELECT max(a) FROM t3)
    }]
    db close
  } {}
}

# The following tests checks to make sure sqlite3_blocking_step() is
# faster than sqlite3_step(). "Faster" in this case means uses fewer
# CPU cycles. This is not always the same as faster in wall-clock time 
# for this type of test. The number of CPU cycles per transaction is 
# roughly proportional to the number of attempts made (i.e. one plus the 
# number of SQLITE_BUSY or SQLITE_LOCKED errors that require the transaction 
# to be retried). So this test just measures that a greater percentage of
# transactions attempted using blocking_step() succeed.
#
# The blocking_step() function is almost always faster on multi-core and is
# usually faster on single-core.  But sometimes, by chance, step() will be
# faster on a single core, in which case the
# following test will fail.
#
puts "The following test seeks to demonstrate that the sqlite3_unlock_notify()"
puts "interface helps multi-core systems to run more efficiently.  This test"
puts "sometimes fails on single-core machines."
puts [array get anWrite]
do_test notify2-3 {
  set blocking [expr {
    double($anSuccess(sqlite3_blocking_step)) /
    double($anAttempt(sqlite3_blocking_step)) 
  }]
  set non [expr {
    double($anSuccess(sqlite3_step)) /
    double($anAttempt(sqlite3_step)) 
  }]
  puts -nonewline [format " blocking: %.1f%% non-blocking %.1f%% ..." \
    [expr $blocking*100.0] [expr $non*100.0]]

  expr {$blocking > $non}
} {1}

sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
