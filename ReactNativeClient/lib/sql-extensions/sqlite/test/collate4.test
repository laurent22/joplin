#
# 2001 September 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is page cache subsystem.
#
# $Id: collate4.test,v 1.9 2008/01/05 17:39:30 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

db collate TEXT text_collate
proc text_collate {a b} {
  return [string compare $a $b]
}

# Do an SQL statement.  Append the search count to the end of the result.
#
proc count sql {
  set ::sqlite_search_count 0
  return [concat [execsql $sql] $::sqlite_search_count]
}

# This procedure executes the SQL.  Then it checks the generated program
# for the SQL and appends a "nosort" to the result if the program contains the
# SortCallback opcode.  If the program does not contain the SortCallback
# opcode it appends "sort"
#
proc cksort {sql} {
  set ::sqlite_sort_count 0
  set data [execsql $sql]
  if {$::sqlite_sort_count} {set x sort} {set x nosort}
  lappend data $x
  return $data
}

# 
# Test cases are organized roughly as follows:
#
# collate4-1.*      ORDER BY.
# collate4-2.*      WHERE clauses.
# collate4-3.*      constraints (primary key, unique).
# collate4-4.*      simple min() or max() queries.
# collate4-5.*      REINDEX command
# collate4-6.*      INTEGER PRIMARY KEY indices.
#

#
# These tests - collate4-1.* - check that indices are correctly
# selected or not selected to implement ORDER BY clauses when 
# user defined collation sequences are involved. 
#
# Because these tests also exercise all the different ways indices 
# can be created, they also serve to verify that indices are correctly 
# initialized with user-defined collation sequences when they are
# created.
#
# Tests named collate4-1.1.* use indices with a single column. Tests
# collate4-1.2.* use indices with two columns.
#
do_test collate4-1.1.0 {
  execsql {
    CREATE TABLE collate4t1(a COLLATE NOCASE, b COLLATE TEXT);
    INSERT INTO collate4t1 VALUES( 'a', 'a' );
    INSERT INTO collate4t1 VALUES( 'b', 'b' );
    INSERT INTO collate4t1 VALUES( NULL, NULL );
    INSERT INTO collate4t1 VALUES( 'B', 'B' );
    INSERT INTO collate4t1 VALUES( 'A', 'A' );
    CREATE INDEX collate4i1 ON collate4t1(a);
    CREATE INDEX collate4i2 ON collate4t1(b);
  }
} {}
do_test collate4-1.1.1 {
  cksort {SELECT a FROM collate4t1 ORDER BY a}
} {{} a A b B nosort}
do_test collate4-1.1.2 {
  cksort {SELECT a FROM collate4t1 ORDER BY a COLLATE NOCASE}
} {{} a A b B nosort}
do_test collate4-1.1.3 {
  cksort {SELECT a FROM collate4t1 ORDER BY a COLLATE TEXT}
} {{} A B a b sort}
do_test collate4-1.1.4 {
  cksort {SELECT b FROM collate4t1 ORDER BY b}
} {{} A B a b nosort}
do_test collate4-1.1.5 {
  cksort {SELECT b FROM collate4t1 ORDER BY b COLLATE TEXT}
} {{} A B a b nosort}
do_test collate4-1.1.6 {
  cksort {SELECT b FROM collate4t1 ORDER BY b COLLATE NOCASE, rowid}
} {{} a A b B sort}

do_test collate4-1.1.7 {
  execsql {
    CREATE TABLE collate4t2(
      a PRIMARY KEY COLLATE NOCASE, 
      b UNIQUE COLLATE TEXT
    );
    INSERT INTO collate4t2 VALUES( 'a', 'a' );
    INSERT INTO collate4t2 VALUES( NULL, NULL );
    INSERT INTO collate4t2 VALUES( 'B', 'B' );
  }
} {}
do_test collate4-1.1.8 {
  cksort {SELECT a FROM collate4t2 ORDER BY a}
} {{} a B nosort}
do_test collate4-1.1.9 {
  cksort {SELECT a FROM collate4t2 ORDER BY a COLLATE NOCASE}
} {{} a B nosort}
do_test collate4-1.1.10 {
  cksort {SELECT a FROM collate4t2 ORDER BY a COLLATE TEXT}
} {{} B a sort}
do_test collate4-1.1.11 {
  cksort {SELECT b FROM collate4t2 ORDER BY b}
} {{} B a nosort}
do_test collate4-1.1.12 {
  cksort {SELECT b FROM collate4t2 ORDER BY b COLLATE TEXT}
} {{} B a nosort}
do_test collate4-1.1.13 {
  cksort {SELECT b FROM collate4t2 ORDER BY b COLLATE NOCASE}
} {{} a B sort}

do_test collate4-1.1.14 {
  execsql {
    CREATE TABLE collate4t3(
      b COLLATE TEXT,  
      a COLLATE NOCASE, 
      UNIQUE(a), PRIMARY KEY(b)
    );
    INSERT INTO collate4t3 VALUES( 'a', 'a' );
    INSERT INTO collate4t3 VALUES( NULL, NULL );
    INSERT INTO collate4t3 VALUES( 'B', 'B' );
  }
} {}
do_test collate4-1.1.15 {
  cksort {SELECT a FROM collate4t3 ORDER BY a}
} {{} a B nosort}
do_test collate4-1.1.16 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE NOCASE}
} {{} a B nosort}
do_test collate4-1.1.17 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE TEXT}
} {{} B a sort}
do_test collate4-1.1.18 {
  cksort {SELECT b FROM collate4t3 ORDER BY b}
} {{} B a nosort}
do_test collate4-1.1.19 {
  cksort {SELECT b FROM collate4t3 ORDER BY b COLLATE TEXT}
} {{} B a nosort}
do_test collate4-1.1.20 {
  cksort {SELECT b FROM collate4t3 ORDER BY b COLLATE NOCASE}
} {{} a B sort}

do_test collate4-1.1.21 {
  execsql {
    CREATE TABLE collate4t4(a COLLATE NOCASE, b COLLATE TEXT);
    INSERT INTO collate4t4 VALUES( 'a', 'a' );
    INSERT INTO collate4t4 VALUES( 'b', 'b' );
    INSERT INTO collate4t4 VALUES( NULL, NULL );
    INSERT INTO collate4t4 VALUES( 'B', 'B' );
    INSERT INTO collate4t4 VALUES( 'A', 'A' );
    CREATE INDEX collate4i3 ON collate4t4(a COLLATE TEXT);
    CREATE INDEX collate4i4 ON collate4t4(b COLLATE NOCASE);
  }
} {}
do_test collate4-1.1.22 {
  cksort {SELECT a FROM collate4t4 ORDER BY a, rowid}
} {{} a A b B sort}
do_test collate4-1.1.23 {
  cksort {SELECT a FROM collate4t4 ORDER BY a COLLATE NOCASE, rowid}
} {{} a A b B sort}
do_test collate4-1.1.24 {
  cksort {SELECT a FROM collate4t4 ORDER BY a COLLATE TEXT, rowid}
} {{} A B a b nosort}
do_test collate4-1.1.25 {
  cksort {SELECT b FROM collate4t4 ORDER BY b}
} {{} A B a b sort}
do_test collate4-1.1.26 {
  cksort {SELECT b FROM collate4t4 ORDER BY b COLLATE TEXT}
} {{} A B a b sort}
do_test collate4-1.1.27 {
  cksort {SELECT b FROM collate4t4 ORDER BY b COLLATE NOCASE}
} {{} a A b B nosort}

do_test collate4-1.1.30 {
  execsql {
    DROP TABLE collate4t1;
    DROP TABLE collate4t2;
    DROP TABLE collate4t3;
    DROP TABLE collate4t4;
  }
} {}

do_test collate4-1.2.0 {
  execsql {
    CREATE TABLE collate4t1(a COLLATE NOCASE, b COLLATE TEXT);
    INSERT INTO collate4t1 VALUES( 'a', 'a' );
    INSERT INTO collate4t1 VALUES( 'b', 'b' );
    INSERT INTO collate4t1 VALUES( NULL, NULL );
    INSERT INTO collate4t1 VALUES( 'B', 'B' );
    INSERT INTO collate4t1 VALUES( 'A', 'A' );
    CREATE INDEX collate4i1 ON collate4t1(a, b);
  }
} {}
do_test collate4-1.2.1 {
  cksort {SELECT a FROM collate4t1 ORDER BY a}
} {{} A a B b nosort}
do_test collate4-1.2.2 {
  cksort {SELECT a FROM collate4t1 ORDER BY a COLLATE nocase}
} {{} A a B b nosort}
do_test collate4-1.2.3 {
  cksort {SELECT a FROM collate4t1 ORDER BY a COLLATE text}
} {{} A B a b sort}
do_test collate4-1.2.4 {
  cksort {SELECT a FROM collate4t1 ORDER BY a, b}
} {{} A a B b nosort}
do_test collate4-1.2.5 {
  cksort {SELECT a FROM collate4t1 ORDER BY a, b COLLATE nocase, rowid}
} {{} a A b B sort}
do_test collate4-1.2.6 {
  cksort {SELECT a FROM collate4t1 ORDER BY a, b COLLATE text}
} {{} A a B b nosort}

do_test collate4-1.2.7 {
  execsql {
    CREATE TABLE collate4t2(
      a COLLATE NOCASE, 
      b COLLATE TEXT, 
      PRIMARY KEY(a, b)
    );
    INSERT INTO collate4t2 VALUES( 'a', 'a' );
    INSERT INTO collate4t2 VALUES( NULL, NULL );
    INSERT INTO collate4t2 VALUES( 'B', 'B' );
  }
} {}
do_test collate4-1.2.8 {
  cksort {SELECT a FROM collate4t2 ORDER BY a}
} {{} a B nosort}
do_test collate4-1.2.9 {
  cksort {SELECT a FROM collate4t2 ORDER BY a COLLATE nocase}
} {{} a B nosort}
do_test collate4-1.2.10 {
  cksort {SELECT a FROM collate4t2 ORDER BY a COLLATE text}
} {{} B a sort}
do_test collate4-1.2.11 {
  cksort {SELECT a FROM collate4t2 ORDER BY a, b}
} {{} a B nosort}
do_test collate4-1.2.12 {
  cksort {SELECT a FROM collate4t2 ORDER BY a, b COLLATE nocase}
} {{} a B sort}
do_test collate4-1.2.13 {
  cksort {SELECT a FROM collate4t2 ORDER BY a, b COLLATE text}
} {{} a B nosort}

do_test collate4-1.2.14 {
  execsql {
    CREATE TABLE collate4t3(a COLLATE NOCASE, b COLLATE TEXT);
    INSERT INTO collate4t3 VALUES( 'a', 'a' );
    INSERT INTO collate4t3 VALUES( 'b', 'b' );
    INSERT INTO collate4t3 VALUES( NULL, NULL );
    INSERT INTO collate4t3 VALUES( 'B', 'B' );
    INSERT INTO collate4t3 VALUES( 'A', 'A' );
    CREATE INDEX collate4i2 ON collate4t3(a COLLATE TEXT, b COLLATE NOCASE);
  }
} {}
do_test collate4-1.2.15 {
  cksort {SELECT a FROM collate4t3 ORDER BY a, rowid}
} {{} a A b B sort}
do_test collate4-1.2.16 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE nocase, rowid}
} {{} a A b B sort}
do_test collate4-1.2.17 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE text}
} {{} A B a b nosort}
do_test collate4-1.2.18 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE text, b}
} {{} A B a b sort}
do_test collate4-1.2.19 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE text, b COLLATE nocase}
} {{} A B a b nosort}
do_test collate4-1.2.20 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE text, b COLLATE text}
} {{} A B a b sort}
do_test collate4-1.2.21 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE text DESC}
} {b a B A {} nosort}
do_test collate4-1.2.22 {
  cksort {SELECT a FROM collate4t3 ORDER BY a COLLATE text DESC, b}
} {b a B A {} sort}
do_test collate4-1.2.23 {
  cksort {SELECT a FROM collate4t3 
            ORDER BY a COLLATE text DESC, b COLLATE nocase}
} {b a B A {} sort}
do_test collate4-1.2.24 {
  cksort {SELECT a FROM collate4t3 
            ORDER BY a COLLATE text DESC, b COLLATE nocase DESC}
} {b a B A {} nosort}

do_test collate4-1.2.25 {
  execsql {
    DROP TABLE collate4t1;
    DROP TABLE collate4t2;
    DROP TABLE collate4t3;
  }
} {}

#
# These tests - collate4-2.* - check that indices are correctly
# selected or not selected to implement WHERE clauses when user 
# defined collation sequences are involved. 
#
# Indices may optimise WHERE clauses using <, >, <=, >=, = or IN
# operators.
#
do_test collate4-2.1.0 {
  execsql {
    PRAGMA automatic_index=OFF;
    CREATE TABLE collate4t1(a COLLATE NOCASE);
    CREATE TABLE collate4t2(b COLLATE TEXT);

    INSERT INTO collate4t1 VALUES('a');
    INSERT INTO collate4t1 VALUES('A');
    INSERT INTO collate4t1 VALUES('b');
    INSERT INTO collate4t1 VALUES('B');
    INSERT INTO collate4t1 VALUES('c');
    INSERT INTO collate4t1 VALUES('C');
    INSERT INTO collate4t1 VALUES('d');
    INSERT INTO collate4t1 VALUES('D');
    INSERT INTO collate4t1 VALUES('e');
    INSERT INTO collate4t1 VALUES('D');

    INSERT INTO collate4t2 VALUES('A');
    INSERT INTO collate4t2 VALUES('Z');
  }
} {}
do_test collate4-2.1.1 {
  count {
    SELECT * FROM collate4t2, collate4t1 WHERE a = b;
  }
} {A a A A 19}
do_test collate4-2.1.2 {
  execsql {
    CREATE INDEX collate4i1 ON collate4t1(a);
  }
  count {
    SELECT * FROM collate4t2, collate4t1 WHERE a = b;
  }
} {A a A A 4}
do_test collate4-2.1.3 {
  count {
    SELECT * FROM collate4t2, collate4t1 WHERE b = a;
  }
} {A A 19}
do_test collate4-2.1.4 {
  execsql {
    DROP INDEX collate4i1;
    CREATE INDEX collate4i1 ON collate4t1(a COLLATE TEXT);
  }
  count {
    SELECT * FROM collate4t2, collate4t1 WHERE a = b
     ORDER BY collate4t2.rowid, collate4t1.rowid
  }
} {A a A A 19}
do_test collate4-2.1.5 {
  count {
    SELECT * FROM collate4t2, collate4t1 WHERE b = a;
  }
} {A A 3}
ifcapable subquery {
  do_test collate4-2.1.6 {
    count {
      SELECT a FROM collate4t1 WHERE a IN (SELECT * FROM collate4t2)
       ORDER BY rowid
    }
  } {a A 10}
  do_test collate4-2.1.7 {
    execsql {
      DROP INDEX collate4i1;
      CREATE INDEX collate4i1 ON collate4t1(a);
    }
    count {
      SELECT a FROM collate4t1 WHERE a IN (SELECT * FROM collate4t2)
       ORDER BY rowid
    }
  } {a A 5}
  do_test collate4-2.1.8 {
    count {
      SELECT a FROM collate4t1 WHERE a IN ('z', 'a');
    }
  } {a A 4}
  do_test collate4-2.1.9 {
    execsql {
      DROP INDEX collate4i1;
      CREATE INDEX collate4i1 ON collate4t1(a COLLATE TEXT);
    }
    count {
      SELECT a FROM collate4t1 WHERE a IN ('z', 'a') ORDER BY rowid;
    }
  } {a A 9}
}
do_test collate4-2.1.10 {
  execsql {
    DROP TABLE collate4t1;
    DROP TABLE collate4t2;
  }
} {}

do_test collate4-2.2.0 {
  execsql {
    CREATE TABLE collate4t1(a COLLATE nocase, b COLLATE text, c);
    CREATE TABLE collate4t2(a COLLATE nocase, b COLLATE text, c COLLATE TEXT);

    INSERT INTO collate4t1 VALUES('0', '0', '0');
    INSERT INTO collate4t1 VALUES('0', '0', '1');
    INSERT INTO collate4t1 VALUES('0', '1', '0');
    INSERT INTO collate4t1 VALUES('0', '1', '1');
    INSERT INTO collate4t1 VALUES('1', '0', '0');
    INSERT INTO collate4t1 VALUES('1', '0', '1');
    INSERT INTO collate4t1 VALUES('1', '1', '0');
    INSERT INTO collate4t1 VALUES('1', '1', '1');
    insert into collate4t2 SELECT * FROM collate4t1;
  }
} {}
do_test collate4-2.2.1 {
  count {
    SELECT * FROM collate4t2 NOT INDEXED NATURAL JOIN collate4t1 NOT INDEXED;
  }
} {0 0 0 0 0 1 0 1 0 0 1 1 1 0 0 1 0 1 1 1 0 1 1 1 63}
do_test collate4-2.2.1b {
  execsql {
    CREATE INDEX collate4i1 ON collate4t1(a, b, c);
  }
  count {
    SELECT * FROM collate4t2 NATURAL JOIN collate4t1;
  }
} {0 0 0 0 0 1 0 1 0 0 1 1 1 0 0 1 0 1 1 1 0 1 1 1 29}
do_test collate4-2.2.2 {
  execsql {
    DROP INDEX collate4i1;
    CREATE INDEX collate4i1 ON collate4t1(a, b, c COLLATE text);
  }
  count {
    SELECT * FROM collate4t2 NATURAL JOIN collate4t1;
  }
} {0 0 0 0 0 1 0 1 0 0 1 1 1 0 0 1 0 1 1 1 0 1 1 1 22}

do_test collate4-2.2.10 {
  execsql {
    DROP TABLE collate4t1;
    DROP TABLE collate4t2;
  }
} {}

#
# These tests - collate4-3.* verify that indices that implement
# UNIQUE and PRIMARY KEY constraints operate correctly with user
# defined collation sequences.
#
do_test collate4-3.0 {
  execsql {
    CREATE TABLE collate4t1(a PRIMARY KEY COLLATE NOCASE);
  }
} {}
do_test collate4-3.1 {
  catchsql {
    INSERT INTO collate4t1 VALUES('abc');
    INSERT INTO collate4t1 VALUES('ABC');
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.2 {
  execsql {
    SELECT * FROM collate4t1;
  }
} {abc}
do_test collate4-3.3 {
  catchsql {
    INSERT INTO collate4t1 SELECT upper(a) FROM collate4t1;
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.4 {
  catchsql {
    INSERT INTO collate4t1 VALUES(1);
    UPDATE collate4t1 SET a = 'abc';
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.5 {
  execsql {
    DROP TABLE collate4t1;
    CREATE TABLE collate4t1(a COLLATE NOCASE UNIQUE);
  }
} {}
do_test collate4-3.6 {
  catchsql {
    INSERT INTO collate4t1 VALUES('abc');
    INSERT INTO collate4t1 VALUES('ABC');
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.7 {
  execsql {
    SELECT * FROM collate4t1;
  }
} {abc}
do_test collate4-3.8 {
  catchsql {
    INSERT INTO collate4t1 SELECT upper(a) FROM collate4t1;
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.9 {
  catchsql {
    INSERT INTO collate4t1 VALUES(1);
    UPDATE collate4t1 SET a = 'abc';
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.10 {
  execsql {
    DROP TABLE collate4t1;
    CREATE TABLE collate4t1(a);
    CREATE UNIQUE INDEX collate4i1 ON collate4t1(a COLLATE NOCASE);
  }
} {}
do_test collate4-3.11 {
  catchsql {
    INSERT INTO collate4t1 VALUES('abc');
    INSERT INTO collate4t1 VALUES('ABC');
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.12 {
  execsql {
    SELECT * FROM collate4t1;
  }
} {abc}
do_test collate4-3.13 {
  catchsql {
    INSERT INTO collate4t1 SELECT upper(a) FROM collate4t1;
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}
do_test collate4-3.14 {
  catchsql {
    INSERT INTO collate4t1 VALUES(1);
    UPDATE collate4t1 SET a = 'abc';
  }
} {1 {UNIQUE constraint failed: collate4t1.a}}

do_test collate4-3.15 {
  execsql {
    DROP TABLE collate4t1;
  }
} {}

# Mimic the SQLite 2 collation type NUMERIC.
db collate numeric numeric_collate
proc numeric_collate {lhs rhs} {
  if {$lhs == $rhs} {return 0} 
  return [expr ($lhs>$rhs)?1:-1]
}

#
# These tests - collate4-4.* check that min() and max() only ever 
# use indices constructed with built-in collation type numeric.
#
# CHANGED:  min() and max() now use the collation type. If there
# is an indice that can be used, it is used.
#
do_test collate4-4.0 {
  execsql {
    CREATE TABLE collate4t1(a COLLATE TEXT);
    INSERT INTO collate4t1 VALUES('2');
    INSERT INTO collate4t1 VALUES('10');
    INSERT INTO collate4t1 VALUES('20');
    INSERT INTO collate4t1 VALUES('104');
  }
} {}
do_test collate4-4.1 {
  count {
    SELECT max(a) FROM collate4t1
  }
} {20 3}
do_test collate4-4.2 {
  count {
    SELECT min(a) FROM collate4t1
  }
} {10 3}
do_test collate4-4.3 {
  # Test that the index with collation type TEXT is used.
  execsql {
    CREATE INDEX collate4i1 ON collate4t1(a);
  }
  count {
    SELECT min(a) FROM collate4t1;
  }
} {10 1}
do_test collate4-4.4 {
  count {
    SELECT max(a) FROM collate4t1;
  }
} {20 0}
do_test collate4-4.5 {
  # Test that the index with collation type NUMERIC is not used.
  execsql {
    DROP INDEX collate4i1;
    CREATE INDEX collate4i1 ON collate4t1(a COLLATE NUMERIC);
  }
  count {
    SELECT min(a) FROM collate4t1;
  }
} {10 3}
do_test collate4-4.6 {
  count {
    SELECT max(a) FROM collate4t1;
  }
} {20 3}
do_test collate4-4.7 {
  execsql {
    DROP TABLE collate4t1;
  }
} {}

# Also test the scalar min() and max() functions.
#
do_test collate4-4.8 {
  execsql {
    CREATE TABLE collate4t1(a COLLATE TEXT, b COLLATE NUMERIC);
    INSERT INTO collate4t1 VALUES('11', '101');
    INSERT INTO collate4t1 VALUES('101', '11')
  }
} {}
do_test collate4-4.9 {
  execsql {
    SELECT max(a, b) FROM collate4t1;
  }
} {11 11}
do_test collate4-4.10 {
  execsql {
    SELECT max(b, a) FROM collate4t1;
  }
} {101 101}
do_test collate4-4.11 {
  execsql {
    SELECT max(a, '101') FROM collate4t1;
  }
} {11 101}
do_test collate4-4.12 {
  execsql {
    SELECT max('101', a) FROM collate4t1;
  }
} {11 101}
do_test collate4-4.13 {
  execsql {
    SELECT max(b, '101') FROM collate4t1;
  }
} {101 101}
do_test collate4-4.14 {
  execsql {
    SELECT max('101', b) FROM collate4t1;
  }
} {101 101}

do_test collate4-4.15 {
  execsql {
    DROP TABLE collate4t1;
  }
} {}

#
# These tests - collate4.6.* - ensure that implict INTEGER PRIMARY KEY 
# indices do not confuse collation sequences. 
#
# These indices are never used for sorting in SQLite. And you can't
# create another index on an INTEGER PRIMARY KEY column, so we don't have 
# to test that.
# (Revised 2004-Nov-22):  The ROWID can be used for sorting now.
#
do_test collate4-6.0 {
  execsql {
    CREATE TABLE collate4t1(a INTEGER PRIMARY KEY);
    INSERT INTO collate4t1 VALUES(101);
    INSERT INTO collate4t1 VALUES(10);
    INSERT INTO collate4t1 VALUES(15);
  }
} {}
do_test collate4-6.1 {
  cksort {
    SELECT * FROM collate4t1 ORDER BY 1;
  }
} {10 15 101 nosort}
do_test collate4-6.2 {
  cksort {
    SELECT * FROM collate4t1 ORDER BY oid;
  }
} {10 15 101 nosort}
do_test collate4-6.3 {
  cksort {
    SELECT * FROM collate4t1 ORDER BY oid||'' COLLATE TEXT;
  }
} {10 101 15 sort}

finish_test
