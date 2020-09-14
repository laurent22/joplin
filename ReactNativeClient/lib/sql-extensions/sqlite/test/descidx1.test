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
# $Id: descidx1.test,v 1.10 2008/03/19 00:21:31 drh Exp $
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


# Verify that the file format starts as 4.
#
do_test descidx1-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    CREATE INDEX i1 ON t1(b ASC);
  }
  get_file_format
} {4}
do_test descidx1-1.2 {
  execsql {
    CREATE INDEX i2 ON t1(a DESC);
  }
  get_file_format
} {4}

# Put some information in the table and verify that the descending
# index actually works.
#
do_test descidx1-2.1 {
  execsql {
    INSERT INTO t1 VALUES(1,1);
    INSERT INTO t1 VALUES(2,2);
    INSERT INTO t1 SELECT a+2, a+2 FROM t1;
    INSERT INTO t1 SELECT a+4, a+4 FROM t1;
    SELECT b FROM t1 WHERE a>3 AND a<7;
  }
} {6 5 4}
do_test descidx1-2.2 {
  execsql {
    SELECT a FROM t1 WHERE b>3 AND b<7;
  }
} {4 5 6}
do_test descidx1-2.3 {
  execsql {
    SELECT b FROM t1 WHERE a>=3 AND a<7;
  }
} {6 5 4 3}
do_test descidx1-2.4 {
  execsql {
    SELECT b FROM t1 WHERE a>3 AND a<=7;
  }
} {7 6 5 4}
do_test descidx1-2.5 {
  execsql {
    SELECT b FROM t1 WHERE a>=3 AND a<=7;
  }
} {7 6 5 4 3}
do_test descidx1-2.6 {
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
do_test descidx1-3.1 {
  cksort {SELECT a FROM t1 ORDER BY a}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.2 {
  cksort {SELECT a FROM t1 ORDER BY a ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.3 {
  cksort {SELECT a FROM t1 ORDER BY a DESC}
} {8 7 6 5 4 3 2 1 nosort}
do_test descidx1-3.4 {
  cksort {SELECT b FROM t1 ORDER BY a}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.5 {
  cksort {SELECT b FROM t1 ORDER BY a ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.6 {
  cksort {SELECT b FROM t1 ORDER BY a DESC}
} {8 7 6 5 4 3 2 1 nosort}
do_test descidx1-3.7 {
  cksort {SELECT a FROM t1 ORDER BY b}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.8 {
  cksort {SELECT a FROM t1 ORDER BY b ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.9 {
  cksort {SELECT a FROM t1 ORDER BY b DESC}
} {8 7 6 5 4 3 2 1 nosort}
do_test descidx1-3.10 {
  cksort {SELECT b FROM t1 ORDER BY b}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.11 {
  cksort {SELECT b FROM t1 ORDER BY b ASC}
} {1 2 3 4 5 6 7 8 nosort}
do_test descidx1-3.12 {
  cksort {SELECT b FROM t1 ORDER BY b DESC}
} {8 7 6 5 4 3 2 1 nosort}

do_test descidx1-3.21 {
  cksort {SELECT a FROM t1 WHERE a>3 AND a<8 ORDER BY a}
} {4 5 6 7 nosort}
do_test descidx1-3.22 {
  cksort {SELECT a FROM t1 WHERE a>3 AND a<8 ORDER BY a ASC}
} {4 5 6 7 nosort}
do_test descidx1-3.23 {
  cksort {SELECT a FROM t1 WHERE a>3 AND a<8 ORDER BY a DESC}
} {7 6 5 4 nosort}
do_test descidx1-3.24 {
  cksort {SELECT b FROM t1 WHERE a>3 AND a<8 ORDER BY a}
} {4 5 6 7 nosort}
do_test descidx1-3.25 {
  cksort {SELECT b FROM t1 WHERE a>3 AND a<8 ORDER BY a ASC}
} {4 5 6 7 nosort}
do_test descidx1-3.26 {
  cksort {SELECT b FROM t1 WHERE a>3 AND a<8 ORDER BY a DESC}
} {7 6 5 4 nosort}

# Create a table with indices that are descending on some terms and
# ascending on others.
#
ifcapable bloblit {
  do_test descidx1-4.1 {
    execsql {
      CREATE TABLE t2(a INT, b TEXT, c BLOB, d REAL);
      CREATE INDEX i3 ON t2(a ASC, b DESC, c ASC);
      CREATE INDEX i4 ON t2(b DESC, a ASC, d DESC);
      INSERT INTO t2 VALUES(1,'one',x'31',1.0);
      INSERT INTO t2 VALUES(2,'two',x'3232',2.0);
      INSERT INTO t2 VALUES(3,'three',x'333333',3.0);
      INSERT INTO t2 VALUES(4,'four',x'34343434',4.0);
      INSERT INTO t2 VALUES(5,'five',x'3535353535',5.0);
      INSERT INTO t2 VALUES(6,'six',x'363636363636',6.0);
      INSERT INTO t2 VALUES(2,'two',x'323232',2.1);
      INSERT INTO t2 VALUES(2,'zwei',x'3232',2.2);
      INSERT INTO t2 VALUES(2,NULL,NULL,2.3);
      SELECT count(*) FROM t2;
    }
  } {9}
  do_test descidx1-4.2 {
    execsql {
      SELECT d FROM t2 ORDER BY a;
    }
  } {1.0 2.2 2.0 2.1 2.3 3.0 4.0 5.0 6.0}
  do_test descidx1-4.3 {
    execsql {
      SELECT d FROM t2 WHERE a>=2 ORDER BY a;
    }
  } {2.2 2.0 2.1 2.3 3.0 4.0 5.0 6.0}
  do_test descidx1-4.4 {
    execsql {
      SELECT d FROM t2 WHERE a>2 ORDER BY a;
    }
  } {3.0 4.0 5.0 6.0}
  do_test descidx1-4.5 {
    execsql {
      SELECT d FROM t2 WHERE a=2 AND b>'two';
    }
  } {2.2}
  do_test descidx1-4.6 {
    execsql {
      SELECT d FROM t2 WHERE a=2 AND b>='two';
    }
  } {2.2 2.0 2.1}
  do_test descidx1-4.7 {
    execsql {
      SELECT d FROM t2 WHERE a=2 AND b<'two';
    }
  } {}
  do_test descidx1-4.8 {
    execsql {
      SELECT d FROM t2 WHERE a=2 AND b<='two';
    }
  } {2.0 2.1}
}

do_test descidx1-5.1 {
  execsql {
    CREATE TABLE t3(a,b,c,d);
    CREATE INDEX t3i1 ON t3(a DESC, b ASC, c DESC, d ASC);
    INSERT INTO t3 VALUES(0,0,0,0);
    INSERT INTO t3 VALUES(0,0,0,1);
    INSERT INTO t3 VALUES(0,0,1,0);
    INSERT INTO t3 VALUES(0,0,1,1);
    INSERT INTO t3 VALUES(0,1,0,0);
    INSERT INTO t3 VALUES(0,1,0,1);
    INSERT INTO t3 VALUES(0,1,1,0);
    INSERT INTO t3 VALUES(0,1,1,1);
    INSERT INTO t3 VALUES(1,0,0,0);
    INSERT INTO t3 VALUES(1,0,0,1);
    INSERT INTO t3 VALUES(1,0,1,0);
    INSERT INTO t3 VALUES(1,0,1,1);
    INSERT INTO t3 VALUES(1,1,0,0);
    INSERT INTO t3 VALUES(1,1,0,1);
    INSERT INTO t3 VALUES(1,1,1,0);
    INSERT INTO t3 VALUES(1,1,1,1);
    SELECT count(*) FROM t3;
  }
} {16}
do_test descidx1-5.2 {
  cksort {
    SELECT a||b||c||d FROM t3 ORDER BY a,b,c,d;
  }
} {0000 0001 0010 0011 0100 0101 0110 0111 1000 1001 1010 1011 1100 1101 1110 1111 sort}
do_test descidx1-5.3 {
  cksort {
    SELECT a||b||c||d FROM t3 ORDER BY a DESC, b ASC, c DESC, d ASC;
  }
} {1010 1011 1000 1001 1110 1111 1100 1101 0010 0011 0000 0001 0110 0111 0100 0101 nosort}
do_test descidx1-5.4 {
  cksort {
    SELECT a||b||c||d FROM t3 ORDER BY a ASC, b DESC, c ASC, d DESC;
  }
} {0101 0100 0111 0110 0001 0000 0011 0010 1101 1100 1111 1110 1001 1000 1011 1010 nosort}
do_test descidx1-5.5 {
  cksort {
    SELECT a||b||c FROM t3 WHERE d=0 ORDER BY a DESC, b ASC, c DESC
  }
} {101 100 111 110 001 000 011 010 nosort}
do_test descidx1-5.6 {
  cksort {
    SELECT a||b||c FROM t3 WHERE d=0 ORDER BY a ASC, b DESC, c ASC
  }
} {010 011 000 001 110 111 100 101 nosort}
do_test descidx1-5.7 {
  cksort {
    SELECT a||b||c FROM t3 WHERE d=0 ORDER BY a ASC, b DESC, c DESC
  }
} {011 010 001 000 111 110 101 100 sort}
do_test descidx1-5.8 {
  cksort {
    SELECT a||b||c FROM t3 WHERE d=0 ORDER BY a ASC, b ASC, c ASC
  }
} {000 001 010 011 100 101 110 111 sort}
do_test descidx1-5.9 {
  cksort {
    SELECT a||b||c FROM t3 WHERE d=0 ORDER BY a DESC, b DESC, c ASC
  }
} {110 111 100 101 010 011 000 001 sort}

# Test the legacy_file_format pragma here because we have access to
# the get_file_format command.
#
ifcapable legacyformat {
  do_test descidx1-6.1 {
    db close
    forcedelete test.db test.db-journal
    sqlite3 db test.db
    sqlite3_db_config db LEGACY_FILE_FORMAT
  } {1}
} else {
  do_test descidx1-6.1 {
    db close
    forcedelete test.db test.db-journal
    sqlite3 db test.db
    sqlite3_db_config db LEGACY_FILE_FORMAT
  } {0}
}
do_test descidx1-6.2 {
  sqlite3_db_config db LEGACY_FILE_FORMAT 1
  sqlite3_db_config db LEGACY_FILE_FORMAT
} {1}
do_test descidx1-6.3 {
  execsql {
    CREATE TABLE t1(a,b,c);
  }
  get_file_format
} {1}
ifcapable vacuum {
  # Verify that the file format is preserved across a vacuum.
  do_test descidx1-6.3.1 {
    execsql {VACUUM}
    get_file_format
  } {1}
}
do_test descidx1-6.4 {
  db close
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  sqlite3_db_config db LEGACY_FILE_FORMAT 0
  sqlite3_db_config db LEGACY_FILE_FORMAT
} {0}
do_test descidx1-6.5 {
  execsql {
    CREATE TABLE t1(a,b,c);
    CREATE INDEX i1 ON t1(a ASC, b DESC, c ASC);
    INSERT INTO t1 VALUES(1,2,3);
    INSERT INTO t1 VALUES(1,1,0);
    INSERT INTO t1 VALUES(1,2,1);
    INSERT INTO t1 VALUES(1,3,4);
  }
  get_file_format
} {4}
ifcapable vacuum {
  # Verify that the file format is preserved across a vacuum.
  do_test descidx1-6.6 {
    execsql {VACUUM}
    get_file_format
  } {4}
  do_test descidx1-6.7 {
    sqlite3_db_config db LEGACY_FILE_FORMAT 1
    execsql {
      VACUUM;
    }
    get_file_format
  } {4}
} 



finish_test
