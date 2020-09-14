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
# This file implements regression tests for SQLite library. The focus
# of this file is testing the interaction of manifest types, type affinity
# and comparison expressions.
#
# $Id: types2.test,v 1.7 2007/02/23 03:00:45 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Tests in this file are organized roughly as follows:
#
# types2-1.*: The '=' operator in the absence of an index.
# types2-2.*: The '=' operator implemented using an index.
# types2-3.*: The '<' operator implemented using an index.
# types2-4.*: The '>' operator in the absence of an index.
# types2-5.*: The 'IN(x, y...)' operator in the absence of an index.
# types2-6.*: The 'IN(x, y...)' operator with an index.
# types2-7.*: The 'IN(SELECT...)' operator in the absence of an index.
# types2-8.*: The 'IN(SELECT...)' operator with an index.
#
# All tests test the operators using literals and columns, but no
# other types of expressions. All expressions except columns are
# handled similarly in the implementation.

execsql {
  CREATE TABLE t1(
    i1 INTEGER,
    i2 INTEGER,
    n1 NUMERIC,
    n2 NUMERIC,
    t1 TEXT,
    t2 TEXT,
    o1 BLOB,
    o2 BLOB
  );
  INSERT INTO t1 VALUES(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
}

proc test_bool {testname vars expr res} {
  if { $vars != "" } {
    execsql "UPDATE t1 SET $vars"
  }

  foreach {t e r} [list $testname $expr $res] {}

  do_test $t.1 "execsql {SELECT $e FROM t1}" $r
  do_test $t.2 "execsql {SELECT 1 FROM t1 WHERE $expr}" [expr $r?"1":""]
  do_test $t.3 "execsql {SELECT 1 FROM t1 WHERE NOT ($e)}" [expr $r?"":"1"]
}

# Compare literals against literals. This should always use a numeric
# comparison.
#
# Changed by ticket #805:  Use no affinity for literal comparisons.
#
test_bool types2-1.1 "" {500 = 500.0} 1
test_bool types2-1.2 "" {'500' = 500.0} 0
test_bool types2-1.3 "" {500 = '500.0'} 0
test_bool types2-1.4 "" {'500' = '500.0'} 0

# Compare literals against a column with TEXT affinity
test_bool types2-1.5 {t1=500} {500 = t1} 1
test_bool types2-1.6 {t1=500} {'500' = t1} 1
test_bool types2-1.7 {t1=500} {500.0 = t1} 0
test_bool types2-1.8 {t1=500} {'500.0' = t1} 0
test_bool types2-1.9 {t1='500'} {500 = t1} 1
test_bool types2-1.10 {t1='500'} {'500' = t1} 1
test_bool types2-1.11 {t1='500'} {500.0 = t1} 0
test_bool types2-1.12 {t1='500'} {'500.0' = t1} 0

# Compare literals against a column with NUMERIC affinity
test_bool types2-1.13 {n1=500} {500 = n1} 1
test_bool types2-1.14 {n1=500} {'500' = n1} 1
test_bool types2-1.15 {n1=500} {500.0 = n1} 1
test_bool types2-1.16 {n1=500} {'500.0' = n1} 1
test_bool types2-1.17 {n1='500'} {500 = n1} 1
test_bool types2-1.18 {n1='500'} {'500' = n1} 1
test_bool types2-1.19 {n1='500'} {500.0 = n1} 1
test_bool types2-1.20 {n1='500'} {'500.0' = n1} 1

# Compare literals against a column with affinity NONE
test_bool types2-1.21 {o1=500} {500 = o1} 1
test_bool types2-1.22 {o1=500} {'500' = o1} 0
test_bool types2-1.23 {o1=500} {500.0 = o1} 1
test_bool types2-1.24 {o1=500} {'500.0' = o1} 0
test_bool types2-1.25 {o1='500'} {500 = o1} 0
test_bool types2-1.26 {o1='500'} {'500' = o1} 1
test_bool types2-1.27 {o1='500'} {500.0 = o1} 0
test_bool types2-1.28 {o1='500'} {'500.0' = o1} 0

set vals [list 10 10.0 '10' '10.0' 20 20.0 '20' '20.0' 30 30.0 '30' '30.0']
#              1  2    3    4      5  6    7    8      9  10   11   12

execsql {
  CREATE TABLE t2(i INTEGER, n NUMERIC, t TEXT, o XBLOBY);
  CREATE INDEX t2i1 ON t2(i);
  CREATE INDEX t2i2 ON t2(n);
  CREATE INDEX t2i3 ON t2(t);
  CREATE INDEX t2i4 ON t2(o);
}
foreach v $vals {
  execsql "INSERT INTO t2 VALUES($v, $v, $v, $v);"
}

proc test_boolset {testname where set} {
  set ::tb_sql "SELECT rowid FROM t2 WHERE $where"
  do_test $testname {
    lsort -integer [execsql $::tb_sql]
  } $set
}

test_boolset types2-2.1 {i = 10} {1 2 3 4}
test_boolset types2-2.2 {i = 10.0} {1 2 3 4}
test_boolset types2-2.3 {i = '10'} {1 2 3 4}
test_boolset types2-2.4 {i = '10.0'} {1 2 3 4}

test_boolset types2-2.5 {n = 20} {5 6 7 8}
test_boolset types2-2.6 {n = 20.0} {5 6 7 8}
test_boolset types2-2.7 {n = '20'} {5 6 7 8}
test_boolset types2-2.8 {n = '20.0'} {5 6 7 8}

test_boolset types2-2.9 {t = 20} {5 7}
test_boolset types2-2.10 {t = 20.0} {6 8}
test_boolset types2-2.11 {t = '20'} {5 7}
test_boolset types2-2.12 {t = '20.0'} {6 8}

test_boolset types2-2.10 {o = 30} {9 10}
test_boolset types2-2.11 {o = 30.0} {9 10}
test_boolset types2-2.12 {o = '30'} 11
test_boolset types2-2.13 {o = '30.0'} 12

test_boolset types2-3.1 {i < 20} {1 2 3 4}
test_boolset types2-3.2 {i < 20.0} {1 2 3 4}
test_boolset types2-3.3 {i < '20'} {1 2 3 4}
test_boolset types2-3.4 {i < '20.0'} {1 2 3 4}

test_boolset types2-3.1 {n < 20} {1 2 3 4}
test_boolset types2-3.2 {n < 20.0} {1 2 3 4}
test_boolset types2-3.3 {n < '20'} {1 2 3 4}
test_boolset types2-3.4 {n < '20.0'} {1 2 3 4}

test_boolset types2-3.1 {t < 20} {1 2 3 4}
test_boolset types2-3.2 {t < 20.0} {1 2 3 4 5 7}
test_boolset types2-3.3 {t < '20'} {1 2 3 4}
test_boolset types2-3.4 {t < '20.0'} {1 2 3 4 5 7}

test_boolset types2-3.1 {o < 20} {1 2}
test_boolset types2-3.2 {o < 20.0} {1 2}
test_boolset types2-3.3 {o < '20'} {1 2 3 4 5 6 9 10}
test_boolset types2-3.3 {o < '20.0'} {1 2 3 4 5 6 7 9 10}

# Compare literals against literals (always a numeric comparison).
# Change (by ticket #805):  No affinity in comparisons
test_bool types2-4.1 "" {500 > 60.0} 1
test_bool types2-4.2 "" {'500' > 60.0} 1
test_bool types2-4.3 "" {500 > '60.0'} 0
test_bool types2-4.4 "" {'500' > '60.0'} 0

# Compare literals against a column with TEXT affinity
test_bool types2-4.5 {t1=500.0} {t1 > 500} 1
test_bool types2-4.6 {t1=500.0} {t1 > '500' } 1
test_bool types2-4.7 {t1=500.0} {t1 > 500.0 } 0
test_bool types2-4.8 {t1=500.0} {t1 > '500.0' } 0
test_bool types2-4.9 {t1='500.0'} {t1 > 500 } 1
test_bool types2-4.10 {t1='500.0'} {t1 > '500' } 1
test_bool types2-4.11 {t1='500.0'} {t1 > 500.0 } 0
test_bool types2-4.12 {t1='500.0'} {t1 > '500.0' } 0

# Compare literals against a column with NUMERIC affinity
test_bool types2-4.13 {n1=400} {500 > n1} 1
test_bool types2-4.14 {n1=400} {'500' > n1} 1
test_bool types2-4.15 {n1=400} {500.0 > n1} 1
test_bool types2-4.16 {n1=400} {'500.0' > n1} 1
test_bool types2-4.17 {n1='400'} {500 > n1} 1
test_bool types2-4.18 {n1='400'} {'500' > n1} 1
test_bool types2-4.19 {n1='400'} {500.0 > n1} 1
test_bool types2-4.20 {n1='400'} {'500.0' > n1} 1

# Compare literals against a column with affinity NONE
test_bool types2-4.21 {o1=500} {500 > o1} 0
test_bool types2-4.22 {o1=500} {'500' > o1} 1
test_bool types2-4.23 {o1=500} {500.0 > o1} 0
test_bool types2-4.24 {o1=500} {'500.0' > o1} 1
test_bool types2-4.25 {o1='500'} {500 > o1} 0
test_bool types2-4.26 {o1='500'} {'500' > o1} 0
test_bool types2-4.27 {o1='500'} {500.0 > o1} 0
test_bool types2-4.28 {o1='500'} {'500.0' > o1} 1

ifcapable subquery {
  # types2-5.* - The 'IN (x, y....)' operator with no index.
  # 
  # Compare literals against literals (no affinity applied)
  test_bool types2-5.1 {} {(NULL IN ('10.0', 20)) ISNULL} 1
  test_bool types2-5.2 {} {10 IN ('10.0', 20)} 0
  test_bool types2-5.3 {} {'10' IN ('10.0', 20)} 0
  test_bool types2-5.4 {} {10 IN (10.0, 20)} 1
  test_bool types2-5.5 {} {'10.0' IN (10, 20)} 0
  
  # Compare literals against a column with TEXT affinity
  test_bool types2-5.6 {t1='10.0'} {t1 IN (10.0, 20)} 1
  test_bool types2-5.7 {t1='10.0'} {t1 IN (10, 20)} 0
  test_bool types2-5.8 {t1='10'} {t1 IN (10.0, 20)} 0
  test_bool types2-5.9 {t1='10'} {t1 IN (20, '10.0')} 0
  test_bool types2-5.10 {t1=10} {t1 IN (20, '10')} 1
  
  # Compare literals against a column with NUMERIC affinity
  test_bool types2-5.11 {n1='10.0'} {n1 IN (10.0, 20)} 1
  test_bool types2-5.12 {n1='10.0'} {n1 IN (10, 20)} 1
  test_bool types2-5.13 {n1='10'} {n1 IN (10.0, 20)} 1
  test_bool types2-5.14 {n1='10'} {n1 IN (20, '10.0')} 1
  test_bool types2-5.15 {n1=10} {n1 IN (20, '10')} 1
  
  # Compare literals against a column with affinity NONE
  test_bool types2-5.16 {o1='10.0'} {o1 IN (10.0, 20)} 0
  test_bool types2-5.17 {o1='10.0'} {o1 IN (10, 20)} 0
  test_bool types2-5.18 {o1='10'} {o1 IN (10.0, 20)} 0
  test_bool types2-5.19 {o1='10'} {o1 IN (20, '10.0')} 0
  test_bool types2-5.20 {o1=10} {o1 IN (20, '10')} 0
  test_bool types2-5.21 {o1='10.0'} {o1 IN (10, 20, '10.0')} 1
  test_bool types2-5.22 {o1='10'} {o1 IN (10.0, 20, '10')} 1
  test_bool types2-5.23 {o1=10} {n1 IN (20, '10', 10)} 1

  # Ticket #2248:  Comparisons of strings literals that look like
  # numbers.
  test_bool types2-5.24 {} {'1' IN ('1')} 1
  test_bool types2-5.25 {} {'2' IN (2)} 0
  test_bool types2-5.26 {} {3 IN ('3')} 0
  test_bool types2-5.27 {} {4 IN (4)} 1

  # The affinity of columns on the right side of IN(...) is ignored.
  # All values in the expression list are treated as ordinary expressions,
  # even if they are columns with affinity.
  test_bool types2-5.30 {t1='10'} {10 IN (5,t1,'abc')} 0
  test_bool types2-5.31 {t1='10'} {10 IN ('abc',t1,5)} 0
  test_bool types2-5.32 {t1='010'} {10 IN (5,t1,'abc')} 0
  test_bool types2-5.33 {t1='010'} {10 IN ('abc',t1,5)} 0
  test_bool types2-5.34 {t1='10'} {'10' IN (5,t1,'abc')} 1
  test_bool types2-5.35 {t1='10'} {'10' IN ('abc',t1,5)} 1
  test_bool types2-5.36 {t1='010'} {'10' IN (5,t1,'abc')} 0
  test_bool types2-5.37 {t1='010'} {'10' IN ('abc',t1,5)} 0
  
  # Columns on both the left and right of IN(...).  Only the column
  # on the left matters.  The all values on the right are treated like
  # expressions.
  test_bool types2-5.40 {t1='10',n1=10} {t1 IN (5,n1,11)} 1
  test_bool types2-5.41 {t1='010',n1=10} {t1 IN (5,n1,11)} 0
  test_bool types2-5.42 {t1='10',n1=10} {n1 IN (5,t1,11)} 1
  test_bool types2-5.43 {t1='010',n1=10} {n1 IN (5,t1,11)} 1
}

# Tests named types2-6.* use the same infrastructure as the types2-2.*
# tests. The contents of the vals array is repeated here for easy 
# reference.
# 
# set vals [list 10 10.0 '10' '10.0' 20 20.0 '20' '20.0' 30 30.0 '30' '30.0']
#                1  2    3    4      5  6    7    8      9  10   11   12

ifcapable subquery {
  test_boolset types2-6.1 {o IN ('10', 30)} {3 9 10}
  test_boolset types2-6.2 {o IN (20.0, 30.0)} {5 6 9 10}
  test_boolset types2-6.3 {t IN ('10', 30)} {1 3 9 11}
  test_boolset types2-6.4 {t IN (20.0, 30.0)} {6 8 10 12}
  test_boolset types2-6.5 {n IN ('10', 30)} {1 2 3 4 9 10 11 12}
  test_boolset types2-6.6 {n IN (20.0, 30.0)} {5 6 7 8 9 10 11 12}
  test_boolset types2-6.7 {i IN ('10', 30)} {1 2 3 4 9 10 11 12}
  test_boolset types2-6.8 {i IN (20.0, 30.0)} {5 6 7 8 9 10 11 12}

  # Also test than IN(x, y, z) works on a rowid:
  test_boolset types2-6.9 {rowid IN (1, 6, 10)} {1 6 10}
}

# Tests types2-7.* concentrate on expressions of the form 
# "x IN (SELECT...)" with no index.
execsql {
  CREATE TABLE t3(i INTEGER, n NUMERIC, t TEXT, o BLOB);
  INSERT INTO t3 VALUES(1, 1, 1, 1);
  INSERT INTO t3 VALUES(2, 2, 2, 2);
  INSERT INTO t3 VALUES(3, 3, 3, 3);
  INSERT INTO t3 VALUES('1', '1', '1', '1');
  INSERT INTO t3 VALUES('1.0', '1.0', '1.0', '1.0');
}

ifcapable subquery {
  test_bool types2-7.1 {i1=1} {i1 IN (SELECT i FROM t3)} 1
  test_bool types2-7.2 {i1='2.0'} {i1 IN (SELECT i FROM t3)} 1
  test_bool types2-7.3 {i1='2.0'} {i1 IN (SELECT n FROM t3)} 1
  test_bool types2-7.4 {i1='2.0'} {i1 IN (SELECT t FROM t3)} 1
  test_bool types2-7.5 {i1='2.0'} {i1 IN (SELECT o FROM t3)} 1
  
  test_bool types2-7.6 {n1=1} {n1 IN (SELECT n FROM t3)} 1
  test_bool types2-7.7 {n1='2.0'} {n1 IN (SELECT i FROM t3)} 1
  test_bool types2-7.8 {n1='2.0'} {n1 IN (SELECT n FROM t3)} 1
  test_bool types2-7.9 {n1='2.0'} {n1 IN (SELECT t FROM t3)} 1
  test_bool types2-7.10 {n1='2.0'} {n1 IN (SELECT o FROM t3)} 1
  
  test_bool types2-7.6 {t1=1} {t1 IN (SELECT t FROM t3)} 1
  test_bool types2-7.7 {t1='2.0'} {t1 IN (SELECT t FROM t3)} 0
  test_bool types2-7.8 {t1='2.0'} {t1 IN (SELECT n FROM t3)} 1
  test_bool types2-7.9 {t1='2.0'} {t1 IN (SELECT i FROM t3)} 1
  test_bool types2-7.10 {t1='2.0'} {t1 IN (SELECT o FROM t3)} 0
  test_bool types2-7.11 {t1='1.0'} {t1 IN (SELECT t FROM t3)} 1
  test_bool types2-7.12 {t1='1.0'} {t1 IN (SELECT o FROM t3)} 1
  
  test_bool types2-7.13 {o1=2} {o1 IN (SELECT o FROM t3)} 1
  test_bool types2-7.14 {o1='2'} {o1 IN (SELECT o FROM t3)} 0
  test_bool types2-7.15 {o1='2'} {o1 IN (SELECT o||'' FROM t3)} 1
}

# set vals [list 10 10.0 '10' '10.0' 20 20.0 '20' '20.0' 30 30.0 '30' '30.0']
#                1  2    3    4      5  6    7    8      9  10   11   12
execsql {
  CREATE TABLE t4(i INTEGER, n NUMERIC, t VARCHAR(20), o LARGE BLOB);
  INSERT INTO t4 VALUES(10, 20, 20, 30);
}
ifcapable subquery {
  test_boolset types2-8.1 {i IN (SELECT i FROM t4)} {1 2 3 4}
  test_boolset types2-8.2 {n IN (SELECT i FROM t4)} {1 2 3 4}
  test_boolset types2-8.3 {t IN (SELECT i FROM t4)} {1 2 3 4}
  test_boolset types2-8.4 {o IN (SELECT i FROM t4)} {1 2 3 4}
  test_boolset types2-8.5 {i IN (SELECT t FROM t4)} {5 6 7 8}
  test_boolset types2-8.6 {n IN (SELECT t FROM t4)} {5 6 7 8}
  test_boolset types2-8.7 {t IN (SELECT t FROM t4)} {5 7}
  test_boolset types2-8.8 {o IN (SELECT t FROM t4)} {7}
  test_boolset types2-8.9 {i IN (SELECT o FROM t4)} {9 10 11 12}
  test_boolset types2-8.6 {n IN (SELECT o FROM t4)} {9 10 11 12}
  test_boolset types2-8.7 {t IN (SELECT o FROM t4)} {}
  test_boolset types2-8.8 {o IN (SELECT o FROM t4)} {9 10}
}

finish_test
