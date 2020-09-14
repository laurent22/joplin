# 2008 January 5
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# $Id: minmax3.test,v 1.5 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Do not use a codec for tests in this file, as the database file is
# manipulated directly using tcl scripts (using the [hexio_write] command).
#
do_not_use_codec

# Do an SQL statement.  Append the search count to the end of the result.
#
proc count sql {
  set ::sqlite_search_count 0
  return [concat [execsql $sql] $::sqlite_search_count]
}

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

do_test minmax3-1.0 {
  execsql {
    CREATE TABLE t1(x, y, z);
  }
  db close
  set_file_format 4
  sqlite3 db test.db
  execsql {
    BEGIN;
    INSERT INTO t1 VALUES('1', 'I',   'one');
    INSERT INTO t1 VALUES('2', 'IV',  'four');
    INSERT INTO t1 VALUES('2', NULL,  'three');
    INSERT INTO t1 VALUES('2', 'II',  'two');
    INSERT INTO t1 VALUES('2', 'V',   'five');
    INSERT INTO t1 VALUES('3', 'VI',  'six');
    COMMIT;
    PRAGMA automatic_index=OFF;
  }
} {}
do_test minmax3-1.1.1 {
  # Linear scan.
  count { SELECT max(y) FROM t1 WHERE x = '2'; }
} {V 5}
do_test minmax3-1.1.2 {
  # Index optimizes the WHERE x='2' constraint.
  execsql { CREATE INDEX i1 ON t1(x) }
  count   { SELECT max(y) FROM t1 WHERE x = '2'; }
} {V 9}
do_test minmax3-1.1.3 {
  # Index optimizes the WHERE x='2' constraint and the MAX(y).
  execsql { CREATE INDEX i2 ON t1(x,y) }
  count   { SELECT max(y) FROM t1 WHERE x = '2'; }
} {V 1}
do_test minmax3-1.1.4 {
  # Index optimizes the WHERE x='2' constraint and the MAX(y).
  execsql { DROP INDEX i2 ; CREATE INDEX i2 ON t1(x, y DESC) }
  count   { SELECT max(y) FROM t1 WHERE x = '2'; }
} {V 1}
do_test minmax3-1.1.5 {
  count   { SELECT max(y) FROM t1 WHERE x = '2' AND y != 'V'; }
} {IV 2}
do_test minmax3-1.1.6 {
  count   { SELECT max(y) FROM t1 WHERE x = '2' AND y < 'V'; }
} {IV 1}
do_test minmax3-1.1.6 {
  count   { SELECT max(y) FROM t1 WHERE x = '2' AND z != 'five'; }
} {IV 4}

do_test minmax3-1.2.1 {
  # Linear scan of t1.
  execsql { DROP INDEX i1 ; DROP INDEX i2 }
  count { SELECT min(y) FROM t1 WHERE x = '2'; }
} {II 5}
do_test minmax3-1.2.2 {
  # Index i1 optimizes the WHERE x='2' constraint.
  execsql { CREATE INDEX i1 ON t1(x) }
  count   { SELECT min(y) FROM t1 WHERE x = '2'; }
} {II 9}
do_test minmax3-1.2.3 {
  # Index i2 optimizes the WHERE x='2' constraint and the min(y).
  execsql { CREATE INDEX i2 ON t1(x,y) }
  count   { SELECT min(y) FROM t1 WHERE x = '2'; }
} {II 1}
do_test minmax3-1.2.4 {
  # Index optimizes the WHERE x='2' constraint and the MAX(y).
  execsql { DROP INDEX i2 ; CREATE INDEX i2 ON t1(x, y DESC) }
  count   { SELECT min(y) FROM t1 WHERE x = '2'; }
} {II 1}

do_test minmax3-1.3.1 {
  # Linear scan
  execsql { DROP INDEX i1 ; DROP INDEX i2 }
  count   { SELECT min(y) FROM t1; }
} {I 5}
do_test minmax3-1.3.2 {
  # Index i1 optimizes the min(y)
  execsql { CREATE INDEX i1 ON t1(y) }
  count   { SELECT min(y) FROM t1; }
} {I 1}
do_test minmax3-1.3.3 {
  # Index i1 optimizes the min(y)
  execsql { DROP INDEX i1 ; CREATE INDEX i1 ON t1(y DESC) }
  count   { SELECT min(y) FROM t1; }
} {I 1}

do_test minmax3-1.4.1 {
  # Linear scan
  execsql { DROP INDEX i1 }
  count   { SELECT max(y) FROM t1; }
} {VI 5}
do_test minmax3-1.4.2 {
  # Index i1 optimizes the max(y)
  execsql { CREATE INDEX i1 ON t1(y) }
  count   { SELECT max(y) FROM t1; }
} {VI 0}
do_test minmax3-1.4.3 {
  # Index i1 optimizes the max(y)
  execsql { DROP INDEX i1 ; CREATE INDEX i1 ON t1(y DESC) }
  execsql   { SELECT y from t1}
  count   { SELECT max(y) FROM t1; }
} {VI 0}
do_test minmax3-1.4.4 {
  execsql { DROP INDEX i1 }
} {}

do_test minmax3-2.1 {
  execsql {
    CREATE TABLE t2(a, b);
    CREATE INDEX i3 ON t2(a, b);
    INSERT INTO t2 VALUES(1, NULL);
    INSERT INTO t2 VALUES(1, 1);
    INSERT INTO t2 VALUES(1, 2);
    INSERT INTO t2 VALUES(1, 3);
    INSERT INTO t2 VALUES(2, NULL);
    INSERT INTO t2 VALUES(2, 1);
    INSERT INTO t2 VALUES(2, 2);
    INSERT INTO t2 VALUES(2, 3);
    INSERT INTO t2 VALUES(3, 1);
    INSERT INTO t2 VALUES(3, 2);
    INSERT INTO t2 VALUES(3, 3);
  }
} {}
do_test minmax3-2.2 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1; }
} {1}
do_test minmax3-2.3 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b>1; }
} {2}
do_test minmax3-2.4 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b>-1; }
} {1}
do_test minmax3-2.5 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1; }
} {1}
do_test minmax3-2.6 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b<2; }
} {1}
do_test minmax3-2.7 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b<1; }
} {{}}
do_test minmax3-2.8 {
  execsql { SELECT min(b) FROM t2 WHERE a = 3 AND b<1; }
} {{}}

do_test minmax3-3.1 {
  execsql {
    DROP TABLE t2;
    CREATE TABLE t2(a, b);
    CREATE INDEX i3 ON t2(a, b DESC);
    INSERT INTO t2 VALUES(1, NULL);
    INSERT INTO t2 VALUES(1, 1);
    INSERT INTO t2 VALUES(1, 2);
    INSERT INTO t2 VALUES(1, 3);
    INSERT INTO t2 VALUES(2, NULL);
    INSERT INTO t2 VALUES(2, 1);
    INSERT INTO t2 VALUES(2, 2);
    INSERT INTO t2 VALUES(2, 3);
    INSERT INTO t2 VALUES(3, 1);
    INSERT INTO t2 VALUES(3, 2);
    INSERT INTO t2 VALUES(3, 3);
  }
} {}
do_test minmax3-3.2 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1; }
} {1}
do_test minmax3-3.3 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b>1; }
} {2}
do_test minmax3-3.4 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b>-1; }
} {1}
do_test minmax3-3.5 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1; }
} {1}
do_test minmax3-3.6 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b<2; }
} {1}
do_test minmax3-3.7 {
  execsql { SELECT min(b) FROM t2 WHERE a = 1 AND b<1; }
} {{}}
do_test minmax3-3.8 {
  execsql { SELECT min(b) FROM t2 WHERE a = 3 AND b<1; }
} {{}}

do_test minmax3-4.1 {
  execsql {
    CREATE TABLE t4(x);
    INSERT INTO t4 VALUES('abc');
    INSERT INTO t4 VALUES('BCD');
    SELECT max(x) FROM t4;
  }
} {abc}
do_test minmax3-4.2 {
  execsql {
    SELECT max(x COLLATE nocase) FROM t4;
  }
} {BCD}
do_test minmax3-4.3 {
  execsql {
    SELECT max(x), max(x COLLATE nocase) FROM t4;
  }
} {abc BCD}
do_test minmax3-4.4 {
  execsql {
    SELECT max(x COLLATE binary), max(x COLLATE nocase) FROM t4;
  }
} {abc BCD}
do_test minmax3-4.5 {
  execsql {
    SELECT max(x COLLATE nocase), max(x COLLATE rtrim) FROM t4;
  }
} {BCD abc}
do_test minmax3-4.6 {
  execsql {
    SELECT max(x COLLATE nocase), max(x) FROM t4;
  }
} {BCD abc}
do_test minmax3-4.10 {
  execsql {
    SELECT min(x) FROM t4;
  }
} {BCD}
do_test minmax3-4.11 {
  execsql {
    SELECT min(x COLLATE nocase) FROM t4;
  }
} {abc}
do_test minmax3-4.12 {
  execsql {
    SELECT min(x), min(x COLLATE nocase) FROM t4;
  }
} {BCD abc}
do_test minmax3-4.13 {
  execsql {
    SELECT min(x COLLATE binary), min(x COLLATE nocase) FROM t4;
  }
} {BCD abc}
do_test minmax3-4.14 {
  execsql {
    SELECT min(x COLLATE nocase), min(x COLLATE rtrim) FROM t4;
  }
} {abc BCD}
do_test minmax3-4.15 {
  execsql {
    SELECT min(x COLLATE nocase), min(x) FROM t4;
  }
} {abc BCD}


finish_test
