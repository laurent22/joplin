# 2005 September 19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the ALTER TABLE statement and
# specifically out-of-memory conditions within that command.
#
# $Id: altermalloc.test,v 1.10 2008/10/30 17:21:13 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_OMIT_ALTERTABLE is defined, omit this file.
ifcapable !altertable {
  finish_test
  return
}

source $testdir/malloc_common.tcl

do_malloc_test altermalloc-1 -tclprep {
  db close
} -tclbody {
  if {[catch {sqlite3 db test.db}]} {
    error "out of memory"
  }
  sqlite3_db_config_lookaside db 0 0 0
  sqlite3_extended_result_codes db 1
} -sqlbody {
  CREATE TABLE t1(a int);
  ALTER TABLE t1 ADD COLUMN b INTEGER DEFAULT NULL;
  ALTER TABLE t1 ADD COLUMN c TEXT DEFAULT 'default-text';
  ALTER TABLE t1 RENAME TO t2;
  ALTER TABLE t2 ADD COLUMN d BLOB DEFAULT X'ABCD';
}

# Test malloc() failure on an ALTER TABLE on a virtual table.
#
ifcapable vtab {
  do_malloc_test altermalloc-vtab -tclprep {
    sqlite3 db2 test.db 
    sqlite3_db_config_lookaside db2 0 0 0
    sqlite3_extended_result_codes db2 1
    register_echo_module [sqlite3_connection_pointer db2]
    db2 eval {
      CREATE TABLE t1(a, b VARCHAR, c INTEGER);
      CREATE VIRTUAL TABLE t1echo USING echo(t1);
    }
    db2 close

    register_echo_module [sqlite3_connection_pointer db]
  } -tclbody {
    set rc [catch {db eval { ALTER TABLE t1echo RENAME TO t1_echo }} msg]
    if {$msg eq "vtable constructor failed: t1echo"} {
      set msg "out of memory"
    }
    if {$rc} {
      error $msg
    }
  }
}

finish_test
