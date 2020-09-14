# 2012 August 24
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
# focus of this file is testing that an index may be used as a covering
# index when there are OR expressions in the WHERE clause. 
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix whereD

do_execsql_test 1.1 {
  CREATE TABLE t(i,j,k,m,n);
  CREATE INDEX ijk ON t(i,j,k);
  CREATE INDEX jmn ON t(j,m,n);

  INSERT INTO t VALUES(3, 3, 'three', 3, 'tres');
  INSERT INTO t VALUES(2, 2, 'two', 2, 'dos');
  INSERT INTO t VALUES(1, 1, 'one', 1, 'uno');
  INSERT INTO t VALUES(4, 4, 'four', 4, 'cuatro');
}

do_execsql_test 1.2 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2);
} {one two}
do_execsql_test 1.3 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (+i=2 AND j=2);
} {one two}
do_execsql_test 1.4 {
  SELECT n FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2);
} {uno dos}
do_execsql_test 1.5 {
  SELECT k, n FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2);
} {one uno two dos}
do_execsql_test 1.6 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2) OR (i=3 AND j=3);
} {one two three}
do_execsql_test 1.7 {
  SELECT n FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2) OR (i=3 AND j=3);
} {uno dos tres}
do_execsql_test 1.8 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (j=2 AND m=2);
} {one two}
do_execsql_test 1.9 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2) OR (j=3 AND m=3);
} {one two three}
do_execsql_test 1.10 {
  SELECT n FROM t WHERE (i=1 AND j=1) OR (i=2 AND j=2) OR (j=3 AND m=3);
} {uno dos tres}
do_execsql_test 1.11 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (j=2 AND m=2) OR (i=3 AND j=3);
} {one two three}
do_execsql_test 1.12 {
  SELECT n FROM t WHERE (i=1 AND j=1) OR (j=2 AND m=2) OR (i=3 AND j=3);
} {uno dos tres}
do_execsql_test 1.13 {
  SELECT k FROM t WHERE (j=1 AND m=1) OR (i=2 AND j=2) OR (i=3 AND j=3);
} {one two three}
do_execsql_test 1.14 {
  SELECT k FROM t WHERE (i=1 AND j=1) OR (j=2 AND i=2) OR (i=3 AND j=3);
} {one two three}
do_execsql_test 1.15 {
  SELECT k FROM t WHERE (i=1 AND j=2) OR (i=2 AND j=1) OR (i=3 AND j=4);
} {}
do_execsql_test 1.16 {
  SELECT k FROM t WHERE (i=1 AND (j=1 or j=2)) OR (i=3 AND j=3);
} {one three}

do_execsql_test 2.0 {
  CREATE TABLE t1(a,b,c,d);
  CREATE INDEX t1b ON t1(b);
  CREATE INDEX t1c ON t1(c);
  CREATE INDEX t1d ON t1(d);
  CREATE TABLE t2(x,y);
  CREATE INDEX t2y ON t2(y);
  
  INSERT INTO t1 VALUES(1,2,3,4);
  INSERT INTO t1 VALUES(5,6,7,8);
  INSERT INTO t2 VALUES(1,2);
  INSERT INTO t2 VALUES(2,7);
  INSERT INTO t2 VALUES(3,4);
} {}
do_execsql_test 2.1 {
  SELECT a, x FROM t1 JOIN t2 ON +y=d OR x=7 ORDER BY a, x;
} {1 3}
do_execsql_test 2.2 {
  SELECT a, x FROM t1 JOIN t2 ON y=d OR x=7 ORDER BY a, x;
} {1 3}


# Similar to [do_execsql_test], except that two elements are appended
# to the result - the string "search" and the number of times test variable
# sqlite3_search_count is incremented by running the supplied SQL. e.g.
# 
#   do_searchcount_test 1.0 { SELECT * FROM t1 } {x y search 2}
#
proc do_searchcount_test {tn sql res} {
  uplevel [subst -nocommands {
    do_test $tn {
      set ::sqlite_search_count 0
      concat [db eval {$sql}] search [set ::sqlite_search_count]
    } [list $res]
  }] 
}

do_execsql_test 3.0 {
  CREATE TABLE t3(a, b, c);
  CREATE UNIQUE INDEX i3 ON t3(a, b);
  INSERT INTO t3 VALUES(1, 'one', 'i');
  INSERT INTO t3 VALUES(3, 'three', 'iii');
  INSERT INTO t3 VALUES(6, 'six', 'vi');
  INSERT INTO t3 VALUES(2, 'two', 'ii');
  INSERT INTO t3 VALUES(4, 'four', 'iv');
  INSERT INTO t3 VALUES(5, 'five', 'v');

  CREATE TABLE t4(x PRIMARY KEY, y);
  INSERT INTO t4 VALUES('a', 'one');
  INSERT INTO t4 VALUES('b', 'two');
}

do_searchcount_test 3.1 {
  SELECT a, b FROM t3 WHERE (a=1 AND b='one') OR (a=2 AND b='two')
} {1 one 2 two search 4}

do_searchcount_test 3.2 {
  SELECT a, c FROM t3 WHERE (a=1 AND b='one') OR (a=2 AND b='two')
} {1 i 2 ii search 6}

do_searchcount_test 3.4.1 {
  SELECT y FROM t4 WHERE x='a'
} {one search 2}
do_searchcount_test 3.4.2 {
  SELECT a, b FROM t3 WHERE 
        (a=1 AND b=(SELECT y FROM t4 WHERE x='a')) 
     OR (a=2 AND b='two')
} {1 one 2 two search 6}
do_searchcount_test 3.4.3 {
  SELECT a, b FROM t3 WHERE 
        (a=2 AND b='two')
     OR (a=1 AND b=(SELECT y FROM t4 WHERE x='a')) 
} {2 two 1 one search 6}
do_searchcount_test 3.4.4 {
  SELECT a, b FROM t3 WHERE 
        (a=2 AND b=(SELECT y FROM t4 WHERE x='b')) 
     OR (a=1 AND b=(SELECT y FROM t4 WHERE x='a')) 
} {2 two 1 one search 8}

do_searchcount_test 3.5.1 {
  SELECT a, b FROM t3 WHERE (a=1 AND b='one') OR rowid=4
} {1 one 2 two search 2}
do_searchcount_test 3.5.2 {
  SELECT a, c FROM t3 WHERE (a=1 AND b='one') OR rowid=4
} {1 i 2 ii search 3}

# Ticket [d02e1406a58ea02d] (2012-10-04)
# LEFT JOIN with an OR in the ON clause causes segfault 
#
do_test 4.1 {
  db eval {
    CREATE TABLE t41(a,b,c);
    INSERT INTO t41 VALUES(1,2,3), (4,5,6);
    CREATE TABLE t42(d,e,f);
    INSERT INTO t42 VALUES(3,6,9), (4,8,12);
    SELECT * FROM t41 AS x LEFT JOIN t42 AS y ON (y.d=x.c) OR (y.e=x.b);
  }
} {1 2 3 3 6 9 4 5 6 {} {} {}}
do_test 4.2 {
  db eval {
    CREATE INDEX t42d ON t42(d);
    CREATE INDEX t42e ON t42(e);
    SELECT * FROM t41 AS x LEFT JOIN t42 AS y ON (y.d=x.c) OR (y.e=x.b);
  }
} {1 2 3 3 6 9 4 5 6 {} {} {}}
do_test 4.3 {
  db eval {
    SELECT * FROM t41 AS x LEFT JOIN t42 AS y ON (y.d=x.c) OR (y.d=x.b);
  }
} {1 2 3 3 6 9 4 5 6 {} {} {}}

# Ticket [bc1aea7b725f276177]
# Incorrect result on LEFT JOIN with OR constraints and an ORDER BY clause.
#
do_execsql_test 4.4 {
  CREATE TABLE t44(a INTEGER, b INTEGER);
  INSERT INTO t44 VALUES(1,2);
  INSERT INTO t44 VALUES(3,4);
  SELECT *
    FROM t44 AS x
       LEFT JOIN (SELECT a AS c, b AS d FROM t44) AS y ON a=c
   WHERE d=4 OR d IS NULL;
} {3 4 3 4}
do_execsql_test 4.5 {
  SELECT *
    FROM t44 AS x
       LEFT JOIN (SELECT a AS c, b AS d FROM t44) AS y ON a=c
   WHERE d=4 OR d IS NULL
   ORDER BY a;
} {3 4 3 4}
do_execsql_test 4.6 {
  CREATE TABLE t46(c INTEGER, d INTEGER);
  INSERT INTO t46 SELECT a, b FROM t44;
  SELECT * FROM t44 LEFT JOIN t46 ON a=c
   WHERE d=4 OR d IS NULL;
} {3 4 3 4}
do_execsql_test 4.7 {
  SELECT * FROM t44 LEFT JOIN t46 ON a=c
   WHERE d=4 OR d IS NULL
   ORDER BY a;
} {3 4 3 4}

# Verify fix of a bug reported on the mailing list by Peter Reid
#
do_execsql_test 5.1 {
  DROP TABLE IF EXISTS t;
  CREATE TABLE t(c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14,c15,c16,c17);
  CREATE INDEX tc0 ON t(c0);
  CREATE INDEX tc1 ON t(c1);
  CREATE INDEX tc2 ON t(c2);
  CREATE INDEX tc3 ON t(c3);
  CREATE INDEX tc4 ON t(c4);
  CREATE INDEX tc5 ON t(c5);
  CREATE INDEX tc6 ON t(c6);
  CREATE INDEX tc7 ON t(c7);
  CREATE INDEX tc8 ON t(c8);
  CREATE INDEX tc9 ON t(c9);
  CREATE INDEX tc10 ON t(c10);
  CREATE INDEX tc11 ON t(c11);
  CREATE INDEX tc12 ON t(c12);
  CREATE INDEX tc13 ON t(c13);
  CREATE INDEX tc14 ON t(c14);
  CREATE INDEX tc15 ON t(c15);
  CREATE INDEX tc16 ON t(c16);
  CREATE INDEX tc17 ON t(c17);
  
  INSERT INTO t(c0, c16) VALUES (1,1);
  
  SELECT * FROM t WHERE
    c0=1 or  c1=1 or  c2=1 or  c3=1 or
    c4=1 or  c5=1 or  c6=1 or  c7=1 or
    c8=1 or  c9=1 or c10=1 or c11=1 or
    c12=1 or c13=1 or c14=1 or c15=1 or
    c16=1 or c17=1;
} {1 {} {} {} {} {} {} {} {} {} {} {} {} {} {} {} 1 {}}
do_execsql_test 5.2 {
  DELETE FROM t;
  INSERT INTO t(c0,c17) VALUES(1,1);
  SELECT * FROM t WHERE
    c0=1 or  c1=1 or  c2=1 or  c3=1 or
    c4=1 or  c5=1 or  c6=1 or  c7=1 or
    c8=1 or  c9=1 or c10=1 or c11=1 or
    c12=1 or c13=1 or c14=1 or c15=1 or
    c16=1 or c17=1;
} {1 {} {} {} {} {} {} {} {} {} {} {} {} {} {} {} {} 1}
do_execsql_test 5.3 {
  DELETE FROM t;
  INSERT INTO t(c0,c15) VALUES(1,1);
  SELECT * FROM t WHERE
    c0=1 or  c1=1 or  c2=1 or  c3=1 or
    c4=1 or  c5=1 or  c6=1 or  c7=1 or
    c8=1 or  c9=1 or c10=1 or c11=1 or
    c12=1 or c13=1 or c14=1 or c15=1 or
    c16=1 or c17=1;
} {1 {} {} {} {} {} {} {} {} {} {} {} {} {} {} 1 {} {}}

#-------------------------------------------------------------------------
do_execsql_test 6.1 {
  CREATE TABLE x1(a, b, c, d, e);
  CREATE INDEX x1a  ON x1(a);
  CREATE INDEX x1bc ON x1(b, c);
  CREATE INDEX x1cd ON x1(c, d);

  INSERT INTO x1 VALUES(1, 2, 3, 4, 'A');
  INSERT INTO x1 VALUES(5, 6, 7, 8, 'B');
  INSERT INTO x1 VALUES(9, 10, 11, 12, 'C');
  INSERT INTO x1 VALUES(13, 14, 15, 16, 'D');
}

do_searchcount_test 6.2.1 {
  SELECT e FROM x1 WHERE b=2 OR c=7;
} {A B search 6}
do_searchcount_test 6.2.2 {
  SELECT c FROM x1 WHERE b=2 OR c=7;
} {3 7 search 4}

do_searchcount_test 6.3.1 {
  SELECT e FROM x1 WHERE a=1 OR b=10;
} {A C search 6}
do_searchcount_test 6.3.2 {
  SELECT c FROM x1 WHERE a=1 OR b=10;
} {3 11 search 5}
do_searchcount_test 6.3.3 {
  SELECT rowid FROM x1 WHERE a=1 OR b=10;
} {1 3 search 4}

do_searchcount_test 6.4.1 {
  SELECT a FROM x1 WHERE b BETWEEN 1 AND 4 OR c BETWEEN 8 AND 12
} {1 9 search 6}
do_searchcount_test 6.4.2 {
  SELECT b, c FROM x1 WHERE b BETWEEN 1 AND 4 OR c BETWEEN 8 AND 12
} {2 3 10 11 search 5}
do_searchcount_test 6.4.3 {
  SELECT rowid, c FROM x1 WHERE b BETWEEN 1 AND 4 OR c BETWEEN 8 AND 12
} {1 3 3 11 search 4}

do_searchcount_test 6.5.1 {
  SELECT a FROM x1 WHERE rowid = 2 OR c=11
} {5 9 search 3}
do_searchcount_test 6.5.2 {
  SELECT d FROM x1 WHERE rowid = 2 OR c=11
} {8 12 search 2}
do_searchcount_test 6.5.3 {
  SELECT d FROM x1 WHERE c=11 OR rowid = 2
} {12 8 search 2}
do_searchcount_test 6.5.4 {
  SELECT a FROM x1 WHERE c=11 OR rowid = 2 
} {9 5 search 3}

do_searchcount_test 6.6.1 {
  SELECT rowid FROM x1 WHERE a=1 OR b=6 OR c=11
} {1 2 3 search 6}
do_searchcount_test 6.6.2 {
  SELECT c FROM x1 WHERE a=1 OR b=6 OR c=11
} {3 7 11 search 7}
do_searchcount_test 6.6.3 {
  SELECT c FROM x1 WHERE c=11 OR a=1 OR b=6 
} {11 3 7 search 7}
do_searchcount_test 6.6.4 {
  SELECT c FROM x1 WHERE b=6 OR c=11 OR a=1
} {7 11 3 search 7}

# 2020-02-22 ticket aa4378693018aa99
# In the OP_Column opcode, if a cursor is marked with OP_NullRow
# (because it is the right table of a LEFT JOIN that does not match)
# then do not substitute index cursors, as the index cursors do not
# have the VdbeCursor.nullRow flag set.
#
do_execsql_test 6.7 {
  DROP TABLE IF EXISTS t1;
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t1(a UNIQUE, b UNIQUE);
  INSERT INTO t1(a,b) VALUES(null,2);
  CREATE VIEW t2 AS SELECT * FROM t1 WHERE b<10 OR a<7 ORDER BY b;
  SELECT t1.* FROM t1 LEFT JOIN t2 ON abs(t1.a)=abs(t2.b);
} {{} 2}


#-------------------------------------------------------------------------
#
do_execsql_test 7.0 {
  CREATE TABLE y1(a, b);
  CREATE TABLE y2(x, y);
  CREATE INDEX y2xy ON y2(x, y);
  INSERT INTO y1 VALUES(1, 1);
  INSERT INTO y2 VALUES(3, 3);
}

do_execsql_test 7.1 {
  SELECT * FROM y1 LEFT JOIN y2 ON ((x=1 AND y=b) OR (x=2 AND y=b))
} {1 1 {} {}}

do_execsql_test 7.3 {
  CREATE TABLE foo (Id INTEGER PRIMARY KEY, fa INTEGER, fb INTEGER); 
  CREATE TABLE bar (Id INTEGER PRIMARY KEY, ba INTEGER, bb INTEGER);

  INSERT INTO foo VALUES(1, 1, 1);
  INSERT INTO foo VALUES(2, 1, 2);
  INSERT INTO foo VALUES(3, 1, 3);
  INSERT INTO foo VALUES(4, 1, 4);
  INSERT INTO foo VALUES(5, 1, 5);
  INSERT INTO foo VALUES(6, 1, 6);
  INSERT INTO foo VALUES(7, 1, 7);
  INSERT INTO foo VALUES(8, 1, 8);
  INSERT INTO foo VALUES(9, 1, 9);

  INSERT INTO bar VALUES(NULL, 1, 1);
  INSERT INTO bar VALUES(NULL, 2, 2);
  INSERT INTO bar VALUES(NULL, 3, 3);
  INSERT INTO bar VALUES(NULL, 1, 4);
  INSERT INTO bar VALUES(NULL, 2, 5);
  INSERT INTO bar VALUES(NULL, 3, 6);
  INSERT INTO bar VALUES(NULL, 1, 7);
  INSERT INTO bar VALUES(NULL, 2, 8);
  INSERT INTO bar VALUES(NULL, 3, 9);
}

do_execsql_test 7.4 {
  SELECT 
    bar.Id, bar.ba, bar.bb, foo.fb
    FROM foo LEFT JOIN bar
           ON (bar.ba = 1 AND bar.bb = foo.fb)
           OR (bar.ba = 5 AND bar.bb = foo.fb);
} {
  1 1 1 1 
  {} {} {} 2 
  {} {} {} 3 
  4 1 4 4 
  {} {} {} 5 
  {} {} {} 6 
  7 1 7 7 
  {} {} {} 8 
  {} {} {} 9
}

do_execsql_test 7.5 {
  CREATE INDEX idx_bar ON bar(ba, bb);
  SELECT 
    bar.Id, bar.ba, bar.bb, foo.fb
    FROM foo LEFT JOIN bar
           ON (bar.ba = 1 AND bar.bb = foo.fb)
           OR (bar.ba = 5 AND bar.bb = foo.fb);
} {
  1 1 1 1 
  {} {} {} 2 
  {} {} {} 3 
  4 1 4 4 
  {} {} {} 5 
  {} {} {} 6 
  7 1 7 7 
  {} {} {} 8 
  {} {} {} 9
}


finish_test
