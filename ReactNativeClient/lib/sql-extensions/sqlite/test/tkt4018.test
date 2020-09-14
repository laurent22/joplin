# 2009 August 20
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
# This file implements tests to verify that ticket #4018 has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
do_not_use_codec

proc testsql {sql} {
  set fd [open tf_main.tcl w]
  puts $fd [subst -nocommands {
    sqlite3_test_control_pending_byte 0x0010000
    sqlite3 db test.db
    set rc [catch { db eval {$sql} } msg]
    puts -nonewline "[set rc] {[set msg]}"
    flush stdout
    exit
  }]
  close $fd
  set fd [open "| [info nameofexec] ./tf_main.tcl" r] 
  set res [read $fd]
  close $fd
  return $res
}

do_test tkt4018-1.1 {
  execsql {
    CREATE TABLE t1(a, b);
    BEGIN;
    SELECT * FROM t1;
  }
} {}

# The database is locked by connection [db]. Open and close a second
# connection to test.db 10000 times. If file-descriptors are not being
# reused, then the process will quickly exceed its maximum number of
# file descriptors (1024 by default on linux).
do_test tkt4018-1.2 {
  for {set i 0} {$i < 10000} {incr i} {
    sqlite3 db2 test.db
    db2 close
  }
} {}

# Now check that connection [db] is still holding a SHARED lock by
# having a second process try to write the db.
do_test tkt4018-1.3 {
  testsql {INSERT INTO t1 VALUES(3, 4)}
} {1 {database is locked}}

# Sanity checking. Have [db] release the lock and then retry the
# INSERT from the previous test case.
do_test tkt4018-1.4 {
  db eval COMMIT
  testsql {INSERT INTO t1 VALUES(3, 4)}
} {0 {}}

# Check that reusing a file descriptor cannot change a read-only 
# connection into a read-write connection.
do_test tkt4018-2.1 {
  sqlite3 db2 test.db
  execsql {INSERT INTO t1 VALUES(1, 2)} db2
} {}
do_test tkt4018-2.2 {
  execsql {
    BEGIN;
    SELECT * FROM t1 ORDER BY a;
  }
} {1 2 3 4}
do_test tkt4018-2.3 {
  db2 close
  sqlite3 db2 test.db -readonly 1
  execsql COMMIT
  catchsql {INSERT INTO t1 VALUES(5, 6)} db2
} {1 {attempt to write a readonly database}}
db2 close

finish_test
