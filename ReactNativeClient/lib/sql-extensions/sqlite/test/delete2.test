# 2003 September 6
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
# focus of this script is a test to replicate the bug reported by
# ticket #842.
#
# Ticket #842 was a database corruption problem caused by a DELETE that
# removed an index entry by not the main table entry.  To recreate the
# problem do this:
#
#   (1) Create a table with an index.  Insert some data into that table.
#   (2) Start a query on the table but do not complete the query.
#   (3) Try to delete a single entry from the table.
#
# Step 3 will fail because there is still a read cursor on the table.
# But the database is corrupted by the DELETE.  It turns out that the
# index entry was deleted first, before the table entry.  And the index
# delete worked.  Thus an entry was deleted from the index but not from
# the table.
#
# The solution to the problem was to detect that the table is locked
# before the index entry is deleted.
#
# $Id: delete2.test,v 1.8 2008/07/08 15:59:52 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Create a table that has an index.
#
do_test delete2-1.1 {
  set DB [sqlite3_connection_pointer db]
  execsql {
    CREATE TABLE q(s string, id string, constraint pk_q primary key(id));
    BEGIN;
    INSERT INTO q(s,id) VALUES('hello','id.1');
    INSERT INTO q(s,id) VALUES('goodbye','id.2');
    INSERT INTO q(s,id) VALUES('again','id.3');
    END;
    SELECT * FROM q;
  }
} {hello id.1 goodbye id.2 again id.3}
do_test delete2-1.2 {
  execsql {
    SELECT * FROM q WHERE id='id.1';
  }
} {hello id.1}
integrity_check delete2-1.3

# Start a query on the table.  The query should not use the index.
# Do not complete the query, thus leaving the table locked.
#
do_test delete2-1.4 {
  set STMT [sqlite3_prepare $DB {SELECT * FROM q} -1 TAIL]
  sqlite3_step $STMT
} SQLITE_ROW
integrity_check delete2-1.5

# Try to delete a row from the table while a read is in process.
# As of 2006-08-16, this is allowed.  (It used to fail with SQLITE_LOCKED.)
#
do_test delete2-1.6 {
  catchsql {
    DELETE FROM q WHERE rowid=1
  }
} {0 {}}
integrity_check delete2-1.7
do_test delete2-1.8 {
  execsql {
    SELECT * FROM q;
  }
} {goodbye id.2 again id.3}

# Finalize the query, thus clearing the lock on the table.  Then
# retry the delete.  The delete should work this time.
#
do_test delete2-1.9 {
  sqlite3_finalize $STMT
  catchsql {
    DELETE FROM q WHERE rowid=1
  }
} {0 {}}
integrity_check delete2-1.10
do_test delete2-1.11 {
  execsql {
    SELECT * FROM q;
  }
} {goodbye id.2 again id.3}

do_test delete2-2.1 {
  execsql {
    CREATE TABLE t1(a, b);
    CREATE TABLE t2(c, d);
    INSERT INTO t1 VALUES(1, 2);
    INSERT INTO t2 VALUES(3, 4);
    INSERT INTO t2 VALUES(5, 6);
  }
} {}
do_test delete2-2.2 {
  set res [list]
  db eval {
    SELECT CASE WHEN c = 5 THEN b ELSE NULL END AS b, c, d FROM t1, t2
  } {
    db eval {DELETE FROM t1}
    lappend res $b $c $d
  }
  set res
} {{} 3 4 {} 5 6}

finish_test
