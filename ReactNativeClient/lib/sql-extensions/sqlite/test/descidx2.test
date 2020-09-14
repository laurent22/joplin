# 2005 December 21
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
# focus of this script is descending indices.
#
# $Id: descidx2.test,v 1.5 2008/03/19 00:21:31 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec


#db eval {PRAGMA legacy_file_format=OFF}
sqlite3_db_config db LEGACY_FILE_FORMAT 0

# This procedure sets the value of the file-format in file 'test.db'
# to $newval. Also, the schema cookie is incremented.
# 
proc set_file_format {newval} {
  hexio_write test.db 44 [hexio_render_int32 $newval]
  set schemacookie [hexio_get_int [hexio_read test.db 40 4]]
  incr schemacookie
  hexio_write test.db 40 [hexio_render_int32 $schemacookie]
  return {}
}

# This procedure returns the value of the file-format in file 'test.db'.
# 
proc get_file_format {{fname test.db}} {
  return [hexio_get_int [hexio_read $fname 44 4]]
}


# Verify that the file format starts as 4
#
do_test descidx2-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    CREATE INDEX i1 ON t1(b ASC);
  }
  get_file_format
} {4}
do_test descidx2-1.2 {
  execsql {
    CREATE INDEX i2 ON t1(a DESC);
  }
  get_file_format
} {4}

# Before adding any information to the database, set the file format
# back to three.  Then close and reopen the database.  With the file
# format set to three, SQLite should ignore the DESC argument on the
# index.
#
do_test descidx2-2.0 {
  set_file_format 3
  db close
  sqlite3 db test.db
  get_file_format
} {3}

# Put some information in the table and verify that the DESC
# on the index is ignored.
#
do_test descidx2-2.1 {
  execsql {
    INSERT INTO t1 VALUES(1,1);
    INSERT INTO t1 VALUES(2,2);
    INSERT INTO t1 SELECT a+2, a+2 FROM t1;
    INSERT INTO t1 SELECT a+4, a+4 FROM t1;
    SELECT b FROM t1 WHERE a>3 AND a<7;
  }
} {4 5 6}
do_test descidx2-2.2 {
  execsql {
    SELECT a FROM t1 WHERE b>3 AND b<7;
  }
} {4 5 6}
do_test descidx2-2.3 {
  execsql {
    SELECT b FROM t1 WHERE a>=3 AND a<7;
  }
} {3 4 5 6}
do_test descidx2-2.4 {
  execsql {
    SELECT b FROM t1 WHERE a>3 AND a<=7;
  }
} {4 5 6 7}
do_test descidx2-2.5 {
  execsql {
    SELECT b FROM t1 WHERE a>=3 AND a<=7;
  }
} {3 4 5 6 7}
do_test descidx2-2.6 {
  execsql {
    SELECT a FROM t1 WHERE b>=3 AND b<=7;
  }
} {3 4 5 6 7}

# This procedure executes the SQL.  Then it checks to see if the OP_Sort
# opcode was executed.  If an OP_Sort did occur, then "sort" is appended
# to the result.  If no OP_Sort happened, then "nosort" is appended.
#
# This procedure is used to check to make sure sorting is or is not
# occurring as expected.
#
proc cksort {sql} {
  set ::sqlite_sort_count 0
  set data [execsql $sql]
  if {$::sqlite_sort_count} {set x sort} {set x nosort}
  lappend data $x
  return $data
}

# Test sorting using a descending index.
#
do_test descidx2-3.1 {
  cksort {SELECT a FROM t1 ORDER BY a}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.2 {
  cksort {SELECT a FROM t1 ORDER BY a ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.3 {
  cksort {SELECT a FROM t1 ORDER BY a DESC}
} {8 7 6 5 4 3 2 1 nosort}
do_test descidx2-3.4 {
  cksort {SELECT b FROM t1 ORDER BY a}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.5 {
  cksort {SELECT b FROM t1 ORDER BY a ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.6 {
  cksort {SELECT b FROM t1 ORDER BY a DESC}
} {8 7 6 5 4 3 2 1 nosort}
do_test descidx2-3.7 {
  cksort {SELECT a FROM t1 ORDER BY b}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.8 {
  cksort {SELECT a FROM t1 ORDER BY b ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.9 {
  cksort {SELECT a FROM t1 ORDER BY b DESC}
} {8 7 6 5 4 3 2 1 nosort}
do_test descidx2-3.10 {
  cksort {SELECT b FROM t1 ORDER BY b}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.11 {
  cksort {SELECT b FROM t1 ORDER BY b ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx2-3.12 {
  cksort {SELECT b FROM t1 ORDER BY b DESC}
} {8 7 6 5 4 3 2 1 nosort}

do_test descidx2-3.21 {
  cksort {SELECT a FROM t1 WHERE a>3 AND a<8 ORDER BY a}
} {4 5 6 7 nosort}
do_test descidx2-3.22 {
  cksort {SELECT a FROM t1 WHERE a>3 AND a<8 ORDER BY a ASC}
} {4 5 6 7 nosort}
do_test descidx2-3.23 {
  cksort {SELECT a FROM t1 WHERE a>3 AND a<8 ORDER BY a DESC}
} {7 6 5 4 nosort}
do_test descidx2-3.24 {
  cksort {SELECT b FROM t1 WHERE a>3 AND a<8 ORDER BY a}
} {4 5 6 7 nosort}
do_test descidx2-3.25 {
  cksort {SELECT b FROM t1 WHERE a>3 AND a<8 ORDER BY a ASC}
} {4 5 6 7 nosort}
do_test descidx2-3.26 {
  cksort {SELECT b FROM t1 WHERE a>3 AND a<8 ORDER BY a DESC}
} {7 6 5 4 nosort}

finish_test
