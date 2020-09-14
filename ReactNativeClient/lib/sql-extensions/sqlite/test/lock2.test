# 2001 September 15
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
# focus of this script is database locks between competing processes.
#
# $Id: lock2.test,v 1.11 2009/05/01 10:55:34 danielk1977 Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl


# Simple locking test case:
#
# lock2-1.1: Connect a second process to the database.
# lock2-1.2: Establish a RESERVED lock with this process.
# lock2-1.3: Get a SHARED lock with the second process.
# lock2-1.4: Try for a RESERVED lock with process 2. This fails.
# lock2-1.5: Try to upgrade the first process to EXCLUSIVE, this fails so
#            it gets PENDING.
# lock2-1.6: Release the SHARED lock held by the second process. 
# lock2-1.7: Attempt to reaquire a SHARED lock with the second process.
#            this fails due to the PENDING lock.
# lock2-1.8: Ensure the first process can now upgrade to EXCLUSIVE.
#
do_test lock2-1.1 {
  set ::tf1 [launch_testfixture]
  testfixture $::tf1 {
    sqlite3 db test.db -key xyzzy
    db eval {select * from sqlite_master}
  }
} {}
do_test lock2-1.1.1 {
  execsql {pragma lock_status}
} {main unlocked temp closed}
sqlite3_soft_heap_limit 0
do_test lock2-1.2 {
  execsql {
    BEGIN;
    CREATE TABLE abc(a, b, c);
  }
} {}
do_test lock2-1.3 {
  testfixture $::tf1 {
    db eval {
      BEGIN;
      SELECT * FROM sqlite_master;
    }
  }
} {}
do_test lock2-1.4 {
  testfixture $::tf1 {
    catch { db eval { CREATE TABLE def(d, e, f) } } msg
    set msg
  }
} {database is locked}
do_test lock2-1.5 {
  catchsql {
    COMMIT;
  }
} {1 {database is locked}}
do_test lock2-1.6 {
  testfixture $::tf1 {
    db eval {
      SELECT * FROM sqlite_master;
      COMMIT;
    }
  }
} {}
do_test lock2-1.7 {
  testfixture $::tf1 {
    catch { db eval {
      BEGIN;
      SELECT * FROM sqlite_master;
    } } msg 
    set msg
  }
} {database is locked}
do_test lock2-1.8 {
  catchsql {
    COMMIT;
  }
} {0 {}}
do_test lock2-1.9 {
  execsql {
    SELECT * FROM sqlite_master;
  }
} "table abc abc [expr $AUTOVACUUM?3:2] {CREATE TABLE abc(a, b, c)}"
catch flush_async_queue
do_test lock2-1.10 {
  testfixture $::tf1 {
    db eval {
      SELECT * FROM sqlite_master;
    }
  }
} "table abc abc [expr $AUTOVACUUM?3:2] {CREATE TABLE abc(a, b, c)}"

catch {testfixture $::tf1 {db close}}
catch {close $::tf1}
sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)

finish_test
