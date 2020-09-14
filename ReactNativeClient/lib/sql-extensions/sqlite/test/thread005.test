# 2009 March 11
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
# Test a race-condition that shows up in shared-cache mode.
#
# $Id: thread005.test,v 1.5 2009/03/26 14:48:07 danielk1977 Exp $

set testdir [file dirname $argv0]

source $testdir/tester.tcl
if {[run_thread_tests]==0} { finish_test ; return }
ifcapable !shared_cache {
  finish_test
  return
}

db close

# Use shared-cache mode for these tests.
# 
set ::enable_shared_cache [sqlite3_enable_shared_cache]
sqlite3_enable_shared_cache 1

#-------------------------------------------------------------------------
# This test attempts to hit the race condition fixed by commit [6363].
#
proc runsql {zSql {db {}}} {
  set rc SQLITE_OK
  while {$rc=="SQLITE_OK" && $zSql ne ""} {
    set STMT [sqlite3_prepare_v2 $db $zSql -1 zSql]
    while {[set rc [sqlite3_step $STMT]] eq "SQLITE_ROW"} { }
    set rc [sqlite3_finalize $STMT]
  }
  return $rc
}
do_test thread005-1.1 {
  sqlite3 db test.db
  db eval { CREATE TABLE t1(a, b) }
  db close
} {}
for {set ii 2} {$ii < 500} {incr ii} {
  unset -nocomplain finished
  thread_spawn finished(0) {sqlite3_open test.db}
  thread_spawn finished(1) {sqlite3_open test.db}
  if {![info exists finished(0)]} { vwait finished(0) }
  if {![info exists finished(1)]} { vwait finished(1) }

  do_test thread005-1.$ii {
    runsql { BEGIN }                       $finished(0)
    runsql { INSERT INTO t1 VALUES(1, 2) } $finished(0)

    # If the race-condition was hit, then $finished(0 and $finished(1)
    # will not use the same pager cache. In this case the next statement
    # can be executed succesfully. However, if the race-condition is not
    # hit, then $finished(1) will be blocked by the write-lock held by 
    # $finished(0) on the shared-cache table t1 and the statement will
    # return SQLITE_LOCKED.
    #
    runsql { SELECT * FROM t1 }            $finished(1)
  } {SQLITE_LOCKED}

  sqlite3_close $finished(0)
  sqlite3_close $finished(1)
}


#-------------------------------------------------------------------------
# This test tries to exercise a race-condition that existed in shared-cache
# mode at one point. The test uses two threads; each has a database connection
# open on the same shared cache. The schema of the database is:
#
#    CREATE TABLE t1(a INTEGER PRIMARY KEY, b UNIQUE);
#
# One thread is a reader and the other thread a reader and a writer. The 
# writer thread repeats the following transaction as fast as possible:
# 
#      BEGIN;
#        DELETE FROM t1 WHERE a = (SELECT max(a) FROM t1);
#        INSERT INTO t1 VALUES(NULL, NULL);
#        UPDATE t1 SET b = a WHERE a = (SELECT max(a) FROM t1);
#        SELECT count(*) FROM t1 WHERE b IS NULL;
#      COMMIT;
#
# The reader thread does the following over and over as fast as possible:
#
#      BEGIN;
#        SELECT count(*) FROM t1 WHERE b IS NULL;
#      COMMIT;
#
# The test runs for 20 seconds or until one of the "SELECT count(*)" 
# statements returns a non-zero value. If an SQLITE_LOCKED error occurs,
# the connection issues a ROLLBACK immediately to abandon the current
# transaction.
#
# If everything is working correctly, the "SELECT count(*)" statements 
# should never return a value other than 0. The "INSERT" statement 
# executed by the writer adds a row with "b IS NULL" to the table, but
# the subsequent UPDATE statement sets its "b" value to an integer
# immediately afterwards.
#
# However, before the race-condition was fixed, if the reader's SELECT
# statement hit an error (say an SQLITE_LOCKED) at the same time as the
# writer was executing the UPDATE statement, then it could incorrectly
# rollback the statement-transaction belonging to the UPDATE statement.
# The UPDATE statement would still be reported as successful to the user,
# but it would have no effect on the database contents.
# 
# Note that it has so far only proved possible to hit this race-condition
# when using an ATTACHed database. There doesn't seem to be any reason
# for this, other than that operating on an ATTACHed database means there
# are a few more mutex grabs and releases during the window of time open
# for the race-condition. Maybe this encourages the scheduler to context
# switch or something...
#

forcedelete test.db test2.db
unset -nocomplain finished

do_test thread005-2.1 {
  sqlite3 db test.db
  execsql { ATTACH 'test2.db' AS aux }
  execsql {
    CREATE TABLE aux.t1(a INTEGER PRIMARY KEY, b UNIQUE);
    INSERT INTO t1 VALUES(1, 1);
    INSERT INTO t1 VALUES(2, 2);
  }
  db close
} {}


set ThreadProgram {
  proc execsql {zSql {db {}}} {
    if {$db eq ""} {set db $::DB}

    set lRes [list]
    set rc SQLITE_OK

    while {$rc=="SQLITE_OK" && $zSql ne ""} {
      set STMT [sqlite3_prepare_v2 $db $zSql -1 zSql]
      while {[set rc [sqlite3_step $STMT]] eq "SQLITE_ROW"} {
        for {set i 0} {$i < [sqlite3_column_count $STMT]} {incr i} {
          lappend lRes [sqlite3_column_text $STMT 0]
        }
      }
      set rc [sqlite3_finalize $STMT]
    }

    if {$rc != "SQLITE_OK"} { error "$rc [sqlite3_errmsg $db]" }
    return $lRes
  }

  if {$isWriter} {
    set Sql {
      BEGIN;
        DELETE FROM t1 WHERE a = (SELECT max(a) FROM t1);
        INSERT INTO t1 VALUES(NULL, NULL);
        UPDATE t1 SET b = a WHERE a = (SELECT max(a) FROM t1);
        SELECT count(*) FROM t1 WHERE b IS NULL;
      COMMIT;
    }
  } else {
    set Sql {
      BEGIN;
      SELECT count(*) FROM t1 WHERE b IS NULL;
      COMMIT;
    }
  }

  set ::DB [sqlite3_open test.db]

  execsql { ATTACH 'test2.db' AS aux }

  set result "ok"
  set finish [expr [clock_seconds]+5]
  while {$result eq "ok" && [clock_seconds] < $finish} {
    set rc [catch {execsql $Sql} msg]
    if {$rc} {
      if {[string match "SQLITE_LOCKED*" $msg]} {
        catch { execsql ROLLBACK }
      } else {
        sqlite3_close $::DB
        error $msg
      }
    } elseif {$msg ne "0"} {
      set result "failed"
    }
  }

  sqlite3_close $::DB
  set result
}

# There is a race-condition in btree.c that means that if two threads
# attempt to open the same database at roughly the same time, and there
# does not already exist a shared-cache corresponding to that database,
# then two shared-caches can be created instead of one. Things still more
# or less work, but the two database connections do not use the same
# shared-cache.
#
# If the threads run by this test hit this race-condition, the tests
# fail (because SQLITE_BUSY may be unexpectedly returned instead of
# SQLITE_LOCKED). To prevent this from happening, open a couple of
# connections to test.db and test2.db now to make sure that there are
# already shared-caches in memory for all databases opened by the
# test threads.
#
sqlite3 db test.db
sqlite3 db test2.db

puts "Running thread-tests for ~20 seconds"
thread_spawn finished(0) {set isWriter 0} $ThreadProgram
thread_spawn finished(1) {set isWriter 1} $ThreadProgram
if {![info exists finished(0)]} { vwait finished(0) }
if {![info exists finished(1)]} { vwait finished(1) }

catch { db close }
catch { db2 close }

do_test thread005-2.2 {
  list $finished(0) $finished(1)
} {ok ok}

do_test thread005-2.3 {
  sqlite3 db test.db
  execsql { ATTACH 'test2.db' AS aux }
  execsql { SELECT count(*) FROM t1 WHERE b IS NULL }
} {0}

sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
