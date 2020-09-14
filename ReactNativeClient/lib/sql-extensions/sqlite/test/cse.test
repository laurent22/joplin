# 2008 April 1
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
# Test cases designed to exercise and verify the logic for
# factoring constant expressions out of loops and for
# common subexpression eliminations.
#
# $Id: cse.test,v 1.6 2008/08/04 03:51:24 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix cse

do_test cse-1.1 {
  execsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d, e, f);
    INSERT INTO t1 VALUES(1,11,12,13,14,15);
    INSERT INTO t1 VALUES(2,21,22,23,24,25);
  }
  execsql {
    SELECT b, -b, ~b, NOT b, NOT NOT b, b-b, b+b, b*b, b/b, b FROM t1
  }
} {11 -11 -12 0 1 0 22 121 1 11 21 -21 -22 0 1 0 42 441 1 21}
do_test cse-1.2 {
  execsql {
    SELECT b, b%b, b==b, b!=b, b<b, b<=b, b IS NULL, b NOT NULL, b FROM t1
  }
} {11 0 1 0 0 1 0 1 11 21 0 1 0 0 1 0 1 21}
do_test cse-1.3 {
  execsql {
    SELECT b, abs(b), coalesce(b,-b,NOT b,c,NOT c), c, -c FROM t1;
  }
} {11 11 11 12 -12 21 21 21 22 -22}
do_test cse-1.4 {
  execsql {
    SELECT CASE WHEN a==1 THEN b ELSE c END, b, c FROM t1
  }
} {11 11 12 22 21 22}
do_test cse-1.5 {
  execsql {
    SELECT CASE a WHEN 1 THEN b WHEN 2 THEN c ELSE d END, b, c, d FROM t1
  }
} {11 11 12 13 22 21 22 23}
do_test cse-1.6.1 {
  execsql {
    SELECT CASE b WHEN 11 THEN -b WHEN 21 THEN -c ELSE -d END, b, c, d FROM t1
  }
} {-11 11 12 13 -22 21 22 23}
do_test cse-1.6.2 {
  execsql {
    SELECT CASE b+1 WHEN c THEN d WHEN e THEN f ELSE 999 END, b, c, d FROM t1
  }
} {13 11 12 13 23 21 22 23}
do_test cse-1.6.3 {
  execsql {
    SELECT CASE WHEN b THEN d WHEN e THEN f ELSE 999 END, b, c, d FROM t1
  }
} {13 11 12 13 23 21 22 23}
do_test cse-1.6.4 {
  execsql {
    SELECT b, c, d, CASE WHEN b THEN d WHEN e THEN f ELSE 999 END FROM t1
  }
} {11 12 13 13 21 22 23 23}
do_test cse-1.6.5 {
  execsql {
    SELECT b, c, d, CASE WHEN 0 THEN d WHEN e THEN f ELSE 999 END FROM t1
  }
} {11 12 13 15 21 22 23 25}
do_test cse-1.7 {
  execsql {
    SELECT a, -a, ~a, NOT a, NOT NOT a, a-a, a+a, a*a, a/a, a FROM t1
  }
} {1 -1 -2 0 1 0 2 1 1 1 2 -2 -3 0 1 0 4 4 1 2}
do_test cse-1.8 {
  execsql {
    SELECT a, a%a, a==a, a!=a, a<a, a<=a, a IS NULL, a NOT NULL, a FROM t1
  }
} {1 0 1 0 0 1 0 1 1 2 0 1 0 0 1 0 1 2}
do_test cse-1.9 {
  execsql {
    SELECT NOT b, ~b, NOT NOT b, b FROM t1
  }
} {0 -12 1 11 0 -22 1 21}
do_test cse-1.10 {
  execsql {
    SELECT CAST(b AS integer), typeof(b), CAST(b AS text), typeof(b) FROM t1
  }
} {11 integer 11 integer 21 integer 21 integer}
ifcapable compound {
  do_test cse-1.11 { 
    execsql {
      SELECT *,* FROM t1 WHERE a=2
      UNION ALL
      SELECT *,* FROM t1 WHERE a=1
    }
  } {2 21 22 23 24 25 2 21 22 23 24 25 1 11 12 13 14 15 1 11 12 13 14 15}
  do_test cse-1.12 { 
    execsql {
      SELECT coalesce(b,c,d,e), a, b, c, d, e FROM t1 WHERE a=2
      UNION ALL
      SELECT coalesce(e,d,c,b), e, d, c, b, a FROM t1 WHERE a=1
    }
  } {21 2 21 22 23 24 14 14 13 12 11 1}
}
do_test cse-1.13 {
  execsql {
     SELECT upper(b), typeof(b), b FROM t1
  }
} {11 integer 11 21 integer 21}
do_test cse-1.14 {
  execsql {
     SELECT b, typeof(b), upper(b), typeof(b), b FROM t1
  }
} {11 integer 11 integer 11 21 integer 21 integer 21}

# Overflow the column cache.  Create queries involving more and more
# columns until the cache overflows.  Verify correct operation throughout.
#
do_test cse-2.1 {
  execsql {
    CREATE TABLE t2(a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,
                    a10,a11,a12,a13,a14,a15,a16,a17,a18,a19,
                    a20,a21,a22,a23,a24,a25,a26,a27,a28,a29,
                    a30,a31,a32,a33,a34,a35,a36,a37,a38,a39,
                    a40,a41,a42,a43,a44,a45,a46,a47,a48,a49);
    INSERT INTO t2 VALUES(0,1,2,3,4,5,6,7,8,9,
                    10,11,12,13,14,15,16,17,18,19,
                    20,21,22,23,24,25,26,27,28,29,
                    30,31,32,33,34,35,36,37,38,39,
                    40,41,42,43,44,45,46,47,48,49);
    SELECT * FROM t2;
  }
} {0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49}

for {set i 1} {$i<100} {incr i} {
  set n [expr {int(rand()*44)+5}]
  set colset {}
  set answer {}
  for {set j 0} {$j<$n} {incr j} {
    set r [expr {$j+int(rand()*5)}]
    if {$r>49} {set r [expr {99-$r}]}
    lappend colset a$j a$r 
    lappend answer $j $r
  }
  set sql "SELECT [join $colset ,] FROM t2"
  do_test cse-2.2.$i {
    # explain $::sql
    execsql $::sql
  } $answer
}

#-------------------------------------------------------------------------
# Ticket fd1bda016d1a
#
reset_db
do_execsql_test 3.0 {
  CREATE TABLE t1(a TEXT, b);
  INSERT INTO t1 VALUES('hello', 0);
  INSERT INTO t1 VALUES('world', 0);

  CREATE TABLE t2(x TEXT);
  INSERT INTO t2 VALUES('hello');
  INSERT INTO t2 VALUES('world');

  CREATE TABLE t3(y);
  INSERT INTO t3 VALUES(1000);
} {}

do_execsql_test 3.1 {
  SELECT 1000 = y FROM t3
} {1}

do_execsql_test 3.2 {
  SELECT 1000 IN (SELECT x FROM t2), 1000 = y FROM t3
} {0 1}

do_execsql_test 3.3 {
  SELECT 0 IN (SELECT a), (SELECT a LIMIT 0) FROM t1 
} {0 {} 0 {}}

do_execsql_test 3.4 {
  SELECT 0 IN (SELECT a) FROM t1 WHERE a = 'hello' OR (SELECT a LIMIT 0);
} {0}

do_execsql_test 3.5 {
  CREATE TABLE v0(v1 VARCHAR0);
  INSERT INTO v0 VALUES(2), (3);
  SELECT 0 IN(SELECT v1) FROM v0 WHERE v1 = 2 OR(SELECT v1 LIMIT 0);
} {0}

finish_test
