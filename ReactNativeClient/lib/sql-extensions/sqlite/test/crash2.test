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
# This file implements regression tests for SQLite library.
#
# The focus of this file is testing the ability of the database to
# uses its rollback journal to recover intact (no database corruption)
# from a power failure during the middle of a COMMIT. Even more
# specifically, the tests in this file verify this functionality
# for storage mediums with various sector sizes.
#
# $Id: crash2.test,v 1.6 2008/08/25 07:12:29 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !crashtest {
  finish_test
  return
}

db close

# This test is designed to check that the crash-test infrastructure
# can create files that do not consist of an integer number of
# simulated disk blocks (i.e. 3KB file using 2KB disk blocks).
#
do_test crash2-1.1 {
  crashsql -delay 500 -file test.db -blocksize 2048 {
    PRAGMA auto_vacuum=OFF;
    PRAGMA page_size=1024;
    BEGIN;
    CREATE TABLE abc AS SELECT 1 AS a, 2 AS b, 3 AS c;
    CREATE TABLE def AS SELECT 1 AS d, 2 AS e, 3 AS f;
    COMMIT;
  }
  file size test.db
} {3072}

for {set ii 0} {$ii < 5} {incr ii} {

  # Simple test using the database created above: Create a new
  # table so that page 1 and page 4 are modified. Using a
  # block-size of 2048 and page-size of 1024, this means
  # pages 2 and 3 must also be saved in the journal to avoid
  # risking corruption.
  #
  # The loop is so that this test can be run with a couple
  # of different seeds for the random number generator.
  #
  do_test crash2-1.2.$ii {
    crashsql -file test.db -blocksize 2048 [subst {
      [string repeat {SELECT random();} $ii]
      CREATE TABLE hij(h, i, j);
    }]
    sqlite3 db test.db
    db eval {PRAGMA integrity_check}
  } {ok}
}

proc signature {} {
  return [db eval {SELECT count(*), md5sum(a), md5sum(b), md5sum(c) FROM abc}]
}

# Test case for crashing during journal sync with simulated
# sector-size values from 1024 to 8192.
#
do_test crash2-2.0 {
  execsql BEGIN
  for {set n 0} {$n < 1000} {incr n} {
    execsql "INSERT INTO abc VALUES($n, [expr 2*$n], [expr 3*$n])"
  }
  execsql {
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
    INSERT INTO abc SELECT * FROM abc;
  }
  execsql COMMIT
  expr ([file size test.db] / 1024) > 450
} {1}
for {set i 1} {$i < 30} {incr i} {
  set sig [signature]
  set sector [expr 1024 * 1<<($i%4)]
  db close
  do_test crash2-2.$i.1 {
     crashsql -blocksize $sector -delay [expr $i%5 + 1] -file test.db-journal "
       PRAGMA temp_store = memory;
       BEGIN;
       SELECT random() FROM abc LIMIT $i;
       INSERT INTO abc SELECT randstr(10,10), 0, 0 FROM abc WHERE random()%2==0;
       DELETE FROM abc WHERE random()%2!=0;
       COMMIT;
     "
  } {1 {child process exited abnormally}}
  do_test crash2-2.$i.2 {
    sqlite3 db test.db
    signature
  } $sig
} 


# Test case for crashing during database sync with simulated
# sector-size values from 1024 to 8192.
#
for {set i 1} {$i < 10} {incr i} {
  set sig [signature]
  set sector [expr 1024 * 1<<($i%4)]
  db close
  do_test crash2-3.$i.1 {
     crashsql -blocksize $sector -file test.db "
       BEGIN;
       SELECT random() FROM abc LIMIT $i;
       INSERT INTO abc SELECT randstr(10,10), 0, 0 FROM abc WHERE random()%2==0;
       DELETE FROM abc WHERE random()%2!=0;
       COMMIT;
     "
  } {1 {child process exited abnormally}}
  do_test crash2-3.$i.2 {
    sqlite3 db test.db
    signature
  } $sig
} 

finish_test
