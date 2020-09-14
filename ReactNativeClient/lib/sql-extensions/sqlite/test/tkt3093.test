# 2008 May 2
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
# Ticket #3093
#
# Verify that a busy callback waiting on a reserved lock resolves
# once the lock clears.
#
# $Id: tkt3093.test,v 1.2 2008/05/02 14:23:55 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Set up a test database
#
do_test tkt3093.1 {
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    SELECT * FROM t1
  }
} {1}

# Establish a separate, independent connection to that database.
#
do_test tkt3093.2 {
  catch {sqlite3_enable_shared_cache 0}
  sqlite3 db2 test.db
  db2 eval {
    SELECT * FROM t1
  }
} {1}

# Make sure that clearing a lock allows a pending request for
# a reserved lock to continue.
#
do_test tkt3093.3 {
  # This will be the busy callback for connection db2.  On the first
  # busy callback, commit the transaction in db.  This should clear
  # the lock so that there should not be a second callback.  If the
  # busy handler is called a second time, then fail so that we get
  # timeout.
  proc busy_callback {cnt} {
    if {$cnt==0} {
      db eval COMMIT
      return 0
    } else {
      return 1
    }
  }
  db2 busy ::busy_callback

  # Start a write transaction on db.
  db eval {
     BEGIN;
     INSERT INTO t1 VALUES(2);
  }

  # Attempt to modify the database on db2
  catchsql {
     UPDATE t1 SET x=x+1;
  } db2
} {0 {}}

# Verify that everything worked as expected.  The db transaction should
# have gone first and added entry 2.  Then the db2 transaction would have
# run and added one to each entry.
#
do_test tkt3093.4 {
  db eval {SELECT * FROM t1}
} {2 3}
do_test tkt3093.5 {
  db2 eval {SELECT * FROM t1}
} {2 3}
db2 close

finish_test
