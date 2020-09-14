# 2014-09-25
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
# This file contains tests for the "truncate" option in the multiplexor.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix multiplex4

db close
sqlite3_shutdown
sqlite3_multiplex_initialize {} 0

# delete all filesl with the base name of $basename
#
proc multiplex_delete_db {basename} {
  foreach file [glob -nocomplain $basename.*] {
    forcedelete $file
  }
}

# Return a sorted list of all files with the base name of $basename.
# Except, delete all text from the end of $basename through the NNN
# suffix on the end of the filename.
#
proc multiplex_file_list {basename} {
  set x {}
  foreach file [glob -nocomplain $basename.*] {
    regsub "^$basename\\..*(\\d\\d\\d)\$" $file $basename.\\1 file
    lappend x $file
  }
  return [lsort $x]
}

do_test multiplex4-1.0 {
  multiplex_delete_db mx4test
  sqlite3 db {file:mx4test.db?chunksize=10&truncate=1} -uri 1 -vfs multiplex
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1(x) VALUES(randomblob(250000));
  }
  multiplex_file_list mx4test
} {mx4test.001 mx4test.db}

do_test multiplex4-1.1 {
  db eval {
    DELETE FROM t1;
    VACUUM;
  }
  multiplex_file_list mx4test
} {mx4test.db}

# NB:  The PRAGMA multiplex_truncate command is implemented using the
# SQLITE_FCNTL_PRAGMA file-control...
#
# EVIDENCE-OF: R-12238-55120 Whenever a PRAGMA statement is parsed, an
# SQLITE_FCNTL_PRAGMA file control is sent to the open sqlite3_file
# object corresponding to the database file to which the pragma
# statement refers.
#
do_test multiplex4-1.2 {
  db eval {PRAGMA multiplex_truncate}
} {on}
do_test multiplex4-1.3 {
  db eval {PRAGMA multiplex_truncate=off}
} {off}
do_test multiplex4-1.4 {
  db eval {PRAGMA multiplex_truncate}
} {off}
do_test multiplex4-1.5 {
  db eval {PRAGMA multiplex_truncate=on}
} {on}
do_test multiplex4-1.6 {
  db eval {PRAGMA multiplex_truncate}
} {on}
do_test multiplex4-1.7 {
  db eval {PRAGMA multiplex_truncate=0}
} {off}
do_test multiplex4-1.8 {
  db eval {PRAGMA multiplex_truncate=1}
} {on}
do_test multiplex4-1.9 {
  db eval {PRAGMA multiplex_truncate=0}
} {off}

# EVIDENCE-OF: R-26188-08449 If the SQLITE_FCNTL_PRAGMA file control
# returns SQLITE_OK, then the parser assumes that the VFS has handled
# the PRAGMA itself and the parser generates a no-op prepared statement
# if result string is NULL, or that returns a copy of the result string
# if the string is non-NULL.
#
do_test multiplex4-1.9-explain {
  db eval {EXPLAIN PRAGMA multiplex_truncate=0;}
} {/String8 \d \d \d off/}

do_test multiplex4-1.10 {
  db eval {
    INSERT INTO t1(x) VALUES(randomblob(250000));
  }
  multiplex_file_list mx4test
} {mx4test.001 mx4test.db}

do_test multiplex4-1.11 {
  db eval {
    DELETE FROM t1;
    VACUUM;
  }
  multiplex_file_list mx4test
} {mx4test.001 mx4test.db}

do_test multiplex4-1.12 {
  db eval {
    PRAGMA multiplex_truncate=ON;
    DROP TABLE t1;
    VACUUM;
  }
  multiplex_file_list mx4test
} {mx4test.db}

catch { db close }
forcedelete mx4test.db
sqlite3_multiplex_shutdown
finish_test
