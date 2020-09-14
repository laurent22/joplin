# 2006 January 02
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
# $Id: descidx3.test,v 1.6 2008/03/19 00:21:31 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

ifcapable !bloblit {
  finish_test
  return
}
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

# Verify that the file format starts as 4.
#
do_test descidx3-1.1 {
  execsql {
    CREATE TABLE t1(i INTEGER PRIMARY KEY,a,b,c,d);
    CREATE INDEX t1i1 ON t1(a DESC, b ASC, c DESC);
    CREATE INDEX t1i2 ON t1(b DESC, c ASC, d DESC);
  }
  get_file_format
} {4}

# Put some information in the table and verify that the descending
# index actually works.
#
do_test descidx3-2.1 {
  execsql {
    INSERT INTO t1 VALUES(1, NULL, NULL, NULL, NULL);
    INSERT INTO t1 VALUES(2, 2, 2, 2, 2);
    INSERT INTO t1 VALUES(3, 3, 3, 3, 3);
    INSERT INTO t1 VALUES(4, 2.5, 2.5, 2.5, 2.5);
    INSERT INTO t1 VALUES(5, -5, -5, -5, -5);
    INSERT INTO t1 VALUES(6, 'six', 'six', 'six', 'six');
    INSERT INTO t1 VALUES(7, x'77', x'77', x'77', x'77');
    INSERT INTO t1 VALUES(8, 'eight', 'eight', 'eight', 'eight');
    INSERT INTO t1 VALUES(9, x'7979', x'7979', x'7979', x'7979');
    SELECT count(*) FROM t1;
  }
} 9
do_test descidx3-2.2 {
  execsql {
    SELECT i FROM t1 ORDER BY a;
  }
} {1 5 2 4 3 8 6 7 9}
do_test descidx3-2.3 {
  execsql {
    SELECT i FROM t1 ORDER BY a DESC;
  }
} {9 7 6 8 3 4 2 5 1}

# The "natural" order for the index is decreasing
do_test descidx3-2.4 {
  execsql {
    SELECT i FROM t1 WHERE a<=x'7979';
  }
} {9 7 6 8 3 4 2 5}
do_test descidx3-2.5 {
  execsql {
    SELECT i FROM t1 WHERE a>-99;
  }
} {9 7 6 8 3 4 2 5}

# Even when all values of t1.a are the same, sorting by A returns
# the rows in reverse order because this the natural order of the
# index.
#
do_test descidx3-3.1 {
  execsql {
    UPDATE t1 SET a=1;
    SELECT i FROM t1 ORDER BY a;
  }
} {9 7 6 8 3 4 2 5 1}
do_test descidx3-3.2 {
  execsql {
    SELECT i FROM t1 WHERE a=1 AND b>0 AND b<'zzz'
  }
} {2 4 3 8 6}
do_test descidx3-3.3 {
  execsql {
    SELECT i FROM t1 WHERE b>0 AND b<'zzz'
  }
} {6 8 3 4 2}
do_test descidx3-3.4 {
  execsql {
    SELECT i FROM t1 WHERE a=1 AND b>-9999 AND b<x'ffffffff'
  }
} {5 2 4 3 8 6 7 9}
do_test descidx3-3.5 {
  execsql {
    SELECT i FROM t1 WHERE b>-9999 AND b<x'ffffffff'
  }
} {9 7 6 8 3 4 2 5}

ifcapable subquery {
  # If the subquery capability is not compiled in to the binary, then
  # the IN(...) operator is not available. Hence these tests cannot be 
  # run.
  do_test descidx3-4.1 {
    lsort [execsql {
      UPDATE t1 SET a=2 WHERE i<6;
      SELECT i FROM t1 WHERE a IN (1,2) AND b>0 AND b<'zzz';
    }]
  } {2 3 4 6 8}
  do_test descidx3-4.2 {
    execsql {
      UPDATE t1 SET a=1;
      SELECT i FROM t1 WHERE a IN (1,2) AND b>0 AND b<'zzz';
    }
  } {2 4 3 8 6}
  do_test descidx3-4.3 {
    execsql {
      UPDATE t1 SET b=2;
      SELECT i FROM t1 WHERE a IN (1,2) AND b>0 AND b<'zzz';
    }
  } {9 7 6 8 3 4 2 5 1}
}

finish_test
