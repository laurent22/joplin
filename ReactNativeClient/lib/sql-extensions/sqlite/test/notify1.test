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
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the sqlite3_unlock_notify() API.
#
# $Id: notify1.test,v 1.4 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !unlock_notify||!shared_cache {
  finish_test
  return
}
db close
set ::enable_shared_cache [sqlite3_enable_shared_cache 1]

#-------------------------------------------------------------------------
# Warm body test. Test that an unlock-notify callback can be registered 
# and that it is invoked.
#
do_test notify1-1.1 {
  sqlite3 db test.db
  sqlite3 db2 test.db
  execsql { CREATE TABLE t1(a, b) }
} {}
do_test notify1-1.2 {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES(1, 2);
  }
  catchsql { INSERT INTO t1 VALUES(3, 4) } db2
} {1 {database table is locked}}
do_test notify1-1.3 {
  set zScript ""
  db2 unlock_notify {
    set zScript "db2 eval { INSERT INTO t1 VALUES(3, 4) }"
  }
  execsql { SELECT * FROM t1 }
} {1 2}
do_test notify1-1.4 {
  set zScript
} {}
do_test notify1-1.5 {
  execsql { COMMIT }
  eval $zScript
  execsql { SELECT * FROM t1 }
} {1 2 3 4}

#-------------------------------------------------------------------------
# Verify that invoking the "unlock_notify" method with no arguments
# (which is the equivalent of invoking sqlite3_unlock_notify() with
# a NULL xNotify argument) cancels a pending notify callback.
#
do_test notify1-1.11 {
  execsql { DROP TABLE t1; CREATE TABLE t1(a, b) }
} {}
do_test notify1-1.12 {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES(1, 2);
  }
  catchsql { INSERT INTO t1 VALUES(3, 4) } db2
} {1 {database table is locked}}
do_test notify1-1.13 {
  set zScript ""
  db2 unlock_notify {
    set zScript "db2 eval { INSERT INTO t1 VALUES(3, 4) }"
  }
  execsql { SELECT * FROM t1 }
} {1 2}
do_test notify1-1.14 {
  set zScript
} {}
do_test notify1-1.15 {
  db2 unlock_notify
  execsql { COMMIT }
  eval $zScript
  execsql { SELECT * FROM t1 }
} {1 2}

#-------------------------------------------------------------------------
# The following tests, notify1-2.*, test that deadlock is detected 
# correctly.
# 
do_test notify1-2.1 {
  execsql { 
    CREATE TABLE t2(a, b);
    INSERT INTO t2 VALUES('I', 'II');
  }
} {}

#
# Test for simple deadlock involving two database connections.
#
# 1. Grab a write-lock on t1 with [db]. Then grab a read-lock on t2 with [db2].
# 2. Try to grab a read-lock on t1 with [db2] (fails).
# 3. Have [db2] wait on the read-lock it failed to obtain in step 2.
# 4. Try to grab a write-lock on t2 with [db] (fails).
# 5. Try to have [db] wait on the lock from step 4. Fails, as the system
#    would be deadlocked (since [db2] is already waiting on [db], and this
#    operation would have [db] wait on [db2]).
#
do_test notify1-2.2.1 {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES(5, 6);
  }
  execsql {
    BEGIN;
    SELECT * FROM t2;
  } db2
} {I II}
do_test notify1-2.2.2 {
  catchsql { SELECT * FROM t1 } db2
} {1 {database table is locked: t1}}
do_test notify1-2.2.3 {
  db2 unlock_notify {lappend unlock_notify db2}
} {}
do_test notify1-2.2.4 {
  catchsql { INSERT INTO t2 VALUES('III', 'IV') }
} {1 {database table is locked: t2}}
do_test notify1-2.2.5 {
  set rc [catch { db unlock_notify {lappend unlock_notify db} } msg]
  list $rc $msg
} {1 {database is deadlocked}}

#
# Test for slightly more complex deadlock involving three database
# connections: db, db2 and db3.
#
do_test notify1-2.3.1 {
  db close
  db2 close
  forcedelete test.db test2.db test3.db
  foreach con {db db2 db3} {
    sqlite3 $con test.db
    $con eval { ATTACH 'test2.db' AS aux2 }
    $con eval { ATTACH 'test3.db' AS aux3 }
  }
  execsql {
    CREATE TABLE main.t1(a, b);
    CREATE TABLE aux2.t2(a, b);
    CREATE TABLE aux3.t3(a, b);
  }
} {}
do_test notify1-2.3.2 {
  execsql { BEGIN ; INSERT INTO t1 VALUES(1, 2) } db
  execsql { BEGIN ; INSERT INTO t2 VALUES(1, 2) } db2
  execsql { BEGIN ; INSERT INTO t3 VALUES(1, 2) } db3
} {}
do_test notify1-2.3.3 {
  catchsql { SELECT * FROM t2 } db
} {1 {database table is locked: t2}}
do_test notify1-2.3.4 {
  catchsql { SELECT * FROM t3 } db2
} {1 {database table is locked: t3}}
do_test notify1-2.3.5 {
  catchsql { SELECT * FROM t1 } db3
} {1 {database table is locked: t1}}
do_test notify1-2.3.6 {
  set lUnlock [list]
  db  unlock_notify {lappend lUnlock db}
  db2 unlock_notify {lappend lUnlock db2}
} {}
do_test notify1-2.3.7 {
  set rc [catch { db3 unlock_notify {lappend lUnlock db3} } msg]
  list $rc $msg
} {1 {database is deadlocked}}
do_test notify1-2.3.8 {
  execsql { COMMIT }
  set lUnlock
} {}
do_test notify1-2.3.9 {
  db3 unlock_notify {lappend lUnlock db3} 
  set lUnlock
} {db3}
do_test notify1-2.3.10 {
  execsql { COMMIT } db2
  set lUnlock
} {db3 db}
do_test notify1-2.3.11 {
  execsql { COMMIT } db3
  set lUnlock
} {db3 db db2}
catch { db3 close }
catch { db2 close }
catch { db close }

#-------------------------------------------------------------------------
# The following tests, notify1-3.* and notify1-4.*, test that callbacks 
# can be issued when there are many (>16) connections waiting on a single 
# unlock event.
# 
foreach {tn nConn} {3 20 4 76} {
  do_test notify1-$tn.1 {
    sqlite3 db test.db
    execsql {
      BEGIN;
      INSERT INTO t1 VALUES('a', 'b');
    }
  } {}
  set lUnlock [list]
  set lUnlockFinal [list]
  for {set ii 1} {$ii <= $nConn} {incr ii} {
    do_test notify1-$tn.2.$ii.1 {
      set cmd "db$ii"
      sqlite3 $cmd test.db
      catchsql { SELECT * FROM t1 } $cmd
    } {1 {database table is locked: t1}}
    do_test notify1-$tn.2.$ii.2 {
      $cmd unlock_notify "lappend lUnlock $ii"
    } {}
    lappend lUnlockFinal $ii
  }
  do_test notify1-$tn.3 {
    set lUnlock
  } {}
  do_test notify1-$tn.4 {
    execsql {COMMIT}
    lsort -integer $lUnlock
  } $lUnlockFinal
  do_test notify1-$tn.5 {
    for {set ii 1} {$ii <= $nConn} {incr ii} {
      "db$ii" close
    }
  } {}
}
db close

#-------------------------------------------------------------------------
# These tests, notify1-5.*, test that a malloc() failure that occurs while
# allocating an array to use as an argument to an unlock-notify callback
# is handled correctly.
# 
source $testdir/malloc_common.tcl
do_malloc_test notify1-5 -tclprep {
  set ::lUnlock [list]
  execsql {
    CREATE TABLE t1(a, b);
    BEGIN;
    INSERT INTO t1 VALUES('a', 'b');
  }
  for {set ii 1} {$ii <= 60} {incr ii} {
    set cmd "db$ii"
    sqlite3 $cmd test.db
    catchsql { SELECT * FROM t1 } $cmd
    $cmd unlock_notify "lappend ::lUnlock $ii"
  }
} -sqlbody {
  COMMIT;
} -cleanup {
  # One of two things should have happened:
  #
  #   1) The transaction opened by [db] was not committed. No unlock-notify
  #      callbacks were invoked, OR
  #   2) The transaction opened by [db] was committed and 60 unlock-notify
  #      callbacks were invoked.
  #
  do_test notify1-5.systemstate {
    expr { ([llength $::lUnlock]==0 && [sqlite3_get_autocommit db]==0)
        || ([llength $::lUnlock]==60 && [sqlite3_get_autocommit db]==1)
    }
  } {1}
  for {set ii 1} {$ii <= 60} {incr ii} { "db$ii" close }
}

#-------------------------------------------------------------------------
# Test cases notify1-6.* test cases where the following occur:
# 
#   notify1-6.1.*: Test encountering an SQLITE_LOCKED error when the
#                  "blocking connection" has already been set by a previous
#                  SQLITE_LOCKED.
#
#   notify1-6.2.*: Test encountering an SQLITE_LOCKED error when already
#                  waiting on an unlock-notify callback.
#
#   notify1-6.3.*: Test that if an SQLITE_LOCKED error is encountered while
#                  already waiting on an unlock-notify callback, and then
#                  the blocker that caused the SQLITE_LOCKED commits its
#                  transaction, the unlock-notify callback is not invoked.
#
#   notify1-6.4.*: Like 6.3.*, except that instead of the second blocker
#                  committing its transaction, the first does. The 
#                  unlock-notify callback is therefore invoked.
#
db close
do_test notify1-6.1.1 {
  forcedelete test.db test2.db
  foreach conn {db db2 db3} {
    sqlite3 $conn test.db
    execsql { ATTACH 'test2.db' AS two } $conn
  }
  execsql {
    CREATE TABLE t1(a, b);
    CREATE TABLE two.t2(a, b);
  }
  execsql { 
    BEGIN;
    INSERT INTO t1 VALUES(1, 2);
  } db2
  execsql { 
    BEGIN;
    INSERT INTO t2 VALUES(1, 2);
  } db3
} {}
do_test notify1-6.1.2 {
  catchsql { SELECT * FROM t2 }
} {1 {database table is locked: t2}}
do_test notify1-6.1.3 {
  catchsql { SELECT * FROM t1 }
} {1 {database table is locked: t1}}

do_test notify1-6.2.1 {
  set unlocked 0
  db unlock_notify {set unlocked 1}
  set unlocked
} {0}
do_test notify1-6.2.2 {
  catchsql { SELECT * FROM t2 }
} {1 {database table is locked: t2}}
do_test notify1-6.2.3 {
  execsql { COMMIT } db2
  set unlocked
} {1}

do_test notify1-6.3.1 {
  execsql { 
    BEGIN;
    INSERT INTO t1 VALUES(3, 4);
  } db2
} {}
do_test notify1-6.3.2 {
  catchsql { SELECT * FROM t1 }
} {1 {database table is locked: t1}}
do_test notify1-6.3.3 {
  set unlocked 0
  db unlock_notify {set unlocked 1}
  set unlocked
} {0}
do_test notify1-6.3.4 {
  catchsql { SELECT * FROM t2 }
} {1 {database table is locked: t2}}
do_test notify1-6.3.5 {
  execsql { COMMIT } db3
  set unlocked
} {0}

do_test notify1-6.4.1 {
  execsql { 
    BEGIN;
    INSERT INTO t2 VALUES(3, 4);
  } db3
  catchsql { SELECT * FROM t2 }
} {1 {database table is locked: t2}}
do_test notify1-6.4.2 {
  execsql { COMMIT } db2
  set unlocked
} {1}
do_test notify1-6.4.3 {
  execsql { COMMIT } db3
} {}
db close
db2 close
db3 close

#-------------------------------------------------------------------------
# Test cases notify1-7.* tests that when more than one distinct 
# unlock-notify function is registered, all are invoked correctly.
#
proc unlock_notify {} {
  incr ::unlock_notify
}
do_test notify1-7.1 {
  foreach conn {db db2 db3} {
    sqlite3 $conn test.db
  }
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES(5, 6);
  }
} {}
do_test notify1-7.2 {
  catchsql { SELECT * FROM t1 } db2
} {1 {database table is locked: t1}}
do_test notify1-7.3 {
  catchsql { SELECT * FROM t1 } db3
} {1 {database table is locked: t1}}
do_test notify1-7.4 {
  set unlock_notify 0
  db2 unlock_notify unlock_notify
  sqlite3_unlock_notify db3
} {SQLITE_OK}
do_test notify1-7.5 {
  set unlock_notify
} {0}
do_test notify1-7.6 {
  execsql { COMMIT }
  set unlock_notify
} {2}

#-------------------------------------------------------------------------
# Test cases notify1-8.* tests that the correct SQLITE_LOCKED extended 
# error code is returned in various scenarios.
#
do_test notify1-8.1 {
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES(7, 8);
  }
  catchsql { SELECT * FROM t1 } db2
} {1 {database table is locked: t1}}
do_test notify1-8.2 {
  sqlite3_extended_errcode db2
} {SQLITE_LOCKED_SHAREDCACHE}

do_test notify1-8.3 {
  execsql {
    COMMIT;
    BEGIN EXCLUSIVE;
  }
  catchsql { SELECT * FROM t1 } db2
} {1 {database schema is locked: main}}
do_test notify1-8.4 {
  sqlite3_extended_errcode db2
} {SQLITE_LOCKED_SHAREDCACHE}

do_test notify1-8.X {
  execsql { COMMIT } 
} {}

#-------------------------------------------------------------------------
# Test cases notify1-9.* test the shared-cache 'pending-lock' feature.
#
do_test notify1-9.1 {
  execsql {
    CREATE TABLE t2(a, b);
    BEGIN;
    SELECT * FROM t1;
  } db2
} {1 2 3 4 5 6 7 8}
do_test notify1-9.2 {
  execsql { SELECT * FROM t1 } db3
} {1 2 3 4 5 6 7 8}
do_test notify1-9.3 {
  catchsql { 
    BEGIN;
    INSERT INTO t1 VALUES(9, 10);
  }
} {1 {database table is locked: t1}}
do_test notify1-9.4 {
  catchsql { SELECT * FROM t2 } db3
} {1 {database table is locked}}
do_test notify1-9.5 {
  execsql  { COMMIT } db2
  execsql { SELECT * FROM t2 } db3
} {}
do_test notify1-9.6 {
  execsql  { COMMIT }
} {}

do_test notify1-9.7 {
  execsql {
    BEGIN;
    SELECT * FROM t1;
  } db2
} {1 2 3 4 5 6 7 8}
do_test notify1-9.8 {
  execsql { SELECT * FROM t1 } db3
} {1 2 3 4 5 6 7 8}
do_test notify1-9.9 {
  catchsql { 
    BEGIN;
    INSERT INTO t1 VALUES(9, 10);
  }
} {1 {database table is locked: t1}}
do_test notify1-9.10 {
  catchsql { SELECT * FROM t2 } db3
} {1 {database table is locked}}
do_test notify1-9.11 {
  execsql  { COMMIT }
  execsql { SELECT * FROM t2 } db3
} {}
do_test notify1-9.12 {
  execsql  { COMMIT } db2
} {}

db close
db2 close
db3 close
sqlite3_enable_shared_cache $::enable_shared_cache
finish_test
