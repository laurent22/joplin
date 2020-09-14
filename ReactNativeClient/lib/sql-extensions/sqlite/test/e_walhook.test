# 2014 December 04
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/wal_common.tcl
set testprefix e_walhook


# EVIDENCE-OF: R-00752-43975 The sqlite3_wal_hook() function is used to
# register a callback that is invoked each time data is committed to a
# database in wal mode.
#
#   1.1: shows that the wal-hook is not invoked in rollback mode.
#   1.2: but is invoked in wal mode.
#
set ::wal_hook_count 0
proc my_wal_hook {args} {
  incr ::wal_hook_count
  return 0
}

do_test 1.1.1 {
  db wal_hook my_wal_hook
  execsql {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
  }
  set ::wal_hook_count
} 0
do_test 1.1.2 {
  execsql { PRAGMA journal_mode = wal }
  set ::wal_hook_count
} 0

do_test 1.3 {
  execsql { INSERT INTO t1 VALUES(2) }
  set wal_hook_count
} 1

do_test 1.4 {
  execsql { 
    BEGIN;
      INSERT INTO t1 VALUES(3);
      INSERT INTO t1 VALUES(4);
    COMMIT;
  }
  set wal_hook_count
} 2

# EVIDENCE-OF: R-65366-15139 The callback is invoked by SQLite after the
# commit has taken place and the associated write-lock on the database
# released
#
set ::read_ok 0
proc my_wal_hook {args} {
  sqlite3 db2 test.db
  if {[db2 eval { SELECT * FROM t1 }] == "1 2 3 4 5"} {
    set ::read_ok 1
  }
  db2 close
}
do_test 2.1 {
  execsql { INSERT INTO t1 VALUES(5) }
  set ::read_ok
} 1

# EVIDENCE-OF: R-44294-52863 The third parameter is the name of the
# database that was written to - either "main" or the name of an
# ATTACH-ed database.
#
# EVIDENCE-OF: R-18913-19355 The fourth parameter is the number of pages
# currently in the write-ahead log file, including those that were just
# committed.
#
set ::wal_hook_args [list]
proc my_wal_hook {dbname nEntry} {
  set ::wal_hook_args [list $dbname $nEntry]
}
forcedelete test.db2
do_test 3.0 {
  execsql {
    ATTACH 'test.db2' AS aux;
    CREATE TABLE aux.t2(x);
    PRAGMA aux.journal_mode = wal;
  }
} {wal}

# Database "aux"
do_test 3.1.1 {
  set wal_hook_args [list]
  execsql { INSERT INTO t2 VALUES('a') }
} {}
do_test 3.1.2 {
  set wal_hook_args
} [list aux [wal_frame_count test.db2-wal 1024]]

# Database "main"
do_test 3.2.1 {
  set wal_hook_args [list]
  execsql { INSERT INTO t1 VALUES(6) }
} {}
do_test 3.1.2 {
  set wal_hook_args
} [list main [wal_frame_count test.db-wal 1024]]

# EVIDENCE-OF: R-14034-00929 If an error code is returned, that error
# will propagate back up through the SQLite code base to cause the
# statement that provoked the callback to report an error, though the
# commit will have still occurred.
#
proc my_wal_hook {args} { return 1 ;# SQLITE_ERROR }
do_catchsql_test 4.1 {
  INSERT INTO t1 VALUES(7)
} {1 {SQL logic error}}

proc my_wal_hook {args} { return 5 ;# SQLITE_BUSY }
do_catchsql_test 4.2 {
  INSERT INTO t1 VALUES(8)
} {1 {database is locked}}

proc my_wal_hook {args} { return 14 ;# SQLITE_CANTOPEN }
do_catchsql_test 4.3 {
  INSERT INTO t1 VALUES(9)
} {1 {unable to open database file}}

do_execsql_test 4.4 {
  SELECT * FROM t1
} {1 2 3 4 5 6 7 8 9}

# EVIDENCE-OF: R-10466-53920 Calling sqlite3_wal_hook() replaces any
# previously registered write-ahead log callback.
set ::old_wal_hook 0
proc my_old_wal_hook {args} {
  incr ::old_wal_hook 
  return 0
}
db wal_hook my_old_wal_hook
do_test 5.1 {
  execsql { INSERT INTO t1 VALUES(10) }
  set ::old_wal_hook
} {1}

# Replace old_wal_hook. Observe that it is not invoked after it has 
# been replaced.
proc my_new_wal_hook {args} { return 0 }
db wal_hook my_new_wal_hook
do_test 5.2 {
  execsql { INSERT INTO t1 VALUES(11) }
  set ::old_wal_hook
} {1}



# EVIDENCE-OF: R-57445-43425 Note that the sqlite3_wal_autocheckpoint()
# interface and the wal_autocheckpoint pragma both invoke
# sqlite3_wal_hook() and will overwrite any prior sqlite3_wal_hook()
# settings.
#
set ::old_wal_hook 0
proc my_old_wal_hook {args} { incr ::old_wal_hook ; return 0 }
db wal_hook my_old_wal_hook
do_test 6.1.1 {
  execsql { INSERT INTO t1 VALUES(12) }
  set ::old_wal_hook
} {1}
do_test 6.1.2 {
  execsql { PRAGMA wal_autocheckpoint = 1000 }
  execsql { INSERT INTO t1 VALUES(12) }
  set ::old_wal_hook
} {1}

# EVIDENCE-OF: R-52629-38967 The first parameter passed to the callback
# function when it is invoked is a copy of the third parameter passed to
# sqlite3_wal_hook() when registering the callback.
#
#    This is tricky to test using the tcl interface. However, the
#    mechanism used to invoke the tcl script registered as a wal-hook
#    depends on the context pointer being correctly passed through. And
#    since multiple different wal-hook scripts have been successfully
#    invoked by this test script, consider this tested.
#
# EVIDENCE-OF: R-23378-42536 The second is a copy of the database
# handle.
#
#    There is an assert() in the C wal-hook used by tclsqlite.c to
#    prove this. And that hook has been invoked multiple times when
#    running this script. So consider this requirement tested as well.
#

finish_test
