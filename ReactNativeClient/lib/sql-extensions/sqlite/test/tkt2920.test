# 2008 Feb 1
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2920 is fixed.
#
# $Id: tkt2920.test,v 1.1 2008/02/02 02:48:52 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Create a database file that is full.
#
do_test tkt2920-1.1 {
  db eval {
    PRAGMA page_size=1024;
    PRAGMA max_page_count=40;
    PRAGMA auto_vacuum=0;
    CREATE TABLE filler (fill);
  }
  file size test.db
} {2048}
do_test tkt2920-1.2 {
  db eval BEGIN
  for {set i 0} {$i<34} {incr i} {
    db eval {INSERT INTO filler VALUES(randomblob(1024))}
  }
  db eval COMMIT
}  {}

# Try to add a single new page to the full database.  We get
# a disk full error.  But this does not corrupt the database.
#
do_test tkt2920-1.3 {
  db eval BEGIN
  catchsql {
     INSERT INTO filler VALUES(randomblob(1024))
  }
} {1 {database or disk is full}}
integrity_check tkt2920-1.4

# Increase the maximum size of the database file by 1 page,
# but then try to add a two-page record.  This also fails.
#
do_test tkt2920-1.5 {
  db eval {PRAGMA max_page_count=41}
  catchsql {
     INSERT INTO filler VALUES(randomblob(2048))
  }
} {1 {database or disk is full}}
integrity_check tkt2920-1.6

# Increase the maximum size of the database by one more page.
# This time the insert works.
#
do_test tkt2920-1.7 {
  db eval {PRAGMA max_page_count=42}
  catchsql {
     INSERT INTO filler VALUES(randomblob(2048))
  }
} {0 {}}
integrity_check tkt2920-1.8

# The previous errors cancelled the transaction.
#
do_test tkt2920-1.9 {
  catchsql {COMMIT}
} {1 {cannot commit - no transaction is active}}

finish_test
