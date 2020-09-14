# 2009 April 20
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
# Test cases inspired by ticket #3811.  Tests to make sure that
# the journal_mode can only be changed at appropriate times and that
# all reported changes are effective.
#
# $Id: jrnlmode3.test,v 1.5 2009/04/20 17:43:03 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!pager_pragmas} {
  finish_test
  return
}

#
# Verify that journal_mode=OFF works as long as it occurs before the first
# transaction, even if locking_mode=EXCLUSIVE is enabled.  The behavior if
# journal_mode is changed after the first transaction is undefined and hence
# untested.
#
do_test jrnlmode3-1.1 {
  db eval {
    PRAGMA journal_mode=OFF;
    PRAGMA locking_mode=EXCLUSIVE;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    SELECT * FROM t1;
  }
} {off exclusive 1}
do_test jrnlmode3-1.2 {
  db eval {
    BEGIN;
    INSERT INTO t1 VALUES(2);
    ROLLBACK;
    SELECT * FROM t1;
  }
} {1}

db close
forcedelete test.db test.db-journal
sqlite3 db test.db

do_test jrnlmode3-2.1 {
  db eval {
    PRAGMA locking_mode=EXCLUSIVE;
    PRAGMA journal_mode=OFF;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    SELECT * FROM t1;
  }
} {exclusive off 1}
do_test jrnlmode3-2.2 {
  db eval {
    BEGIN;
    INSERT INTO t1 VALUES(2);
    ROLLBACK;
    SELECT * FROM t1;
  }
} {1}

# Test cases to verify that we can move from any journal_mode
# to any other, as long as we are not in a transaction.  Verify
# that we cannot change journal_mode while a transaction is active.
#
set all_journal_modes {delete persist truncate memory off}
set cnt 0
foreach fromjmode $all_journal_modes {
  foreach tojmode $all_journal_modes {

    # Skip the no-change cases
    if {$fromjmode==$tojmode} continue
    incr cnt

    # Start with a fresh database connection an empty database file.
    #
    db close
    forcedelete test.db test.db-journal
    sqlite3 db test.db

    # Initialize the journal mode.
    #
    do_test jrnlmode3-3.$cnt.1-($fromjmode-to-$tojmode) {
      db eval "PRAGMA journal_mode = $fromjmode;"
    } $fromjmode

    # Verify that the initial journal mode takes.
    #
    do_test jrnlmode3-3.$cnt.2 {
      db eval {PRAGMA main.journal_mode}
    } $fromjmode

    # Start a transaction and try to change the journal mode within
    # the transaction.  This should fail.
    #
    do_test jrnlmode3-3.$cnt.3 {
      db eval {
        CREATE TABLE t1(x);
        BEGIN;
        INSERT INTO t1 VALUES($cnt);
      }
      db eval "PRAGMA journal_mode=$tojmode"
    } $fromjmode

    # Rollback the transaction.  
    #
    do_test jrnlmode3-3.$cnt.4 {
      db eval {
        ROLLBACK;
        SELECT * FROM t1;
      }
    } {}

    # Now change the journal mode again.  This time the new mode
    # should take.
    #
    do_test jrnlmode3-3.$cnt.5 {
      db eval "PRAGMA journal_mode=$tojmode"
    } $tojmode

    # Do a the transaction.  Verify that the rollback occurred
    # if journal_mode!=OFF.
    #
    do_test jrnlmode3-3.$cnt.6 {
      db eval {
        DROP TABLE IF EXISTS t1;
        CREATE TABLE t1(x);
        BEGIN;
        INSERT INTO t1 VALUES(1);
      }
      db eval ROLLBACK
      db eval {
        SELECT * FROM t1;
      }
    } {}
  }
}

finish_test
