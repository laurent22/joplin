# 2010 June 16
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [fc62af4523] has been resolved.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl

do_test tkt-fc62af4523.1 {
  execsql {
    PRAGMA cache_size = 10;
    PRAGMA journal_mode = persist;
    CREATE TABLE t1(a UNIQUE, b UNIQUE);
    INSERT INTO t1 SELECT randomblob(200), randomblob(300);
    INSERT INTO t1 SELECT randomblob(200), randomblob(300) FROM t1; --  2
    INSERT INTO t1 SELECT randomblob(200), randomblob(300) FROM t1; --  4
    INSERT INTO t1 SELECT randomblob(200), randomblob(300) FROM t1; --  8
    INSERT INTO t1 SELECT randomblob(200), randomblob(300) FROM t1; -- 16
    INSERT INTO t1 SELECT randomblob(200), randomblob(300) FROM t1; -- 32
    INSERT INTO t1 SELECT randomblob(200), randomblob(300) FROM t1; -- 64
  }
  execsql {
    PRAGMA integrity_check;
    SELECT count(*) FROM t1;
  }
} {ok 64}

# Launch an external process. Have it write (but not commit) a large
# transaction to the database.
#
set ::chan [launch_testfixture]
proc buddy {code} { testfixture $::chan $code }
do_test tkt-fc62af4523.2 {
  testfixture $::chan {
    sqlite3 db test.db
    db eval {
      PRAGMA cache_size = 10;
      BEGIN;
        UPDATE t1 SET b = randomblob(400);
        UPDATE t1 SET a = randomblob(201);
    }
  }
  file exists test.db-journal
} {1}

# Now do "PRAGMA journal_mode = DELETE" in this process. At one point
# this was causing SQLite to delete the journal file from the file-system,
# even though the external process is currently using it.
#
do_test tkt-fc62af4523.3 { execsql { PRAGMA journal_mode = DELETE } } {delete}
do_test tkt-fc62af4523.4 { file exists test.db-journal } {1}

# Cause the external process to crash. Since it has already written 
# uncommitted data into the database file, the next reader will have
# to do a hot-journal rollback to recover the database.
#
# Or, if this test is run in a version with the bug present, the journal
# file has already been deleted. In this case we are left with a corrupt
# database file and no hot-journal to fix it with.
#
do_test tkt-fc62af4523.5 {
  testfixture $::chan sqlite_abort
} {ERROR: Child process hung up}
after 200
do_test tkt-fc62af4523.6 {
  execsql {
    PRAGMA integrity_check;
    SELECT count(*) FROM t1;
  }
} {ok 64}

catch { close $::chan }
finish_test
