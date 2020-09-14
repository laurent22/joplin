# 2009 November 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Additional test cases for the COALESCE() and IFNULL() functions.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl


do_test coalesce-1.0 {
  db eval {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d);
    INSERT INTO t1 VALUES(1, null, null, null);
    INSERT INTO t1 VALUES(2, 2, 99, 99);
    INSERT INTO t1 VALUES(3, null, 3, 99);
    INSERT INTO t1 VALUES(4, null, null, 4);
    INSERT INTO t1 VALUES(5, null, null, null);
    INSERT INTO t1 VALUES(6, 22, 99, 99);
    INSERT INTO t1 VALUES(7, null, 33, 99);
    INSERT INTO t1 VALUES(8, null, null, 44);

    SELECT coalesce(b,c,d) FROM t1 ORDER BY a;
  }
} {{} 2 3 4 {} 22 33 44}
do_test coalesce-1.1 {
  db eval {
    SELECT coalesce(d+c+b,d+c,d) FROM t1 ORDER BY a;
  }
} {{} 200 102 4 {} 220 132 44}
do_test coalesce-1.2 {
  db eval {
    SELECT ifnull(d+c+b,ifnull(d+c,d)) FROM t1 ORDER BY a;
  }
} {{} 200 102 4 {} 220 132 44}
do_test coalesce-1.3 {
  db eval {
    SELECT ifnull(ifnull(d+c+b,d+c),d) FROM t1 ORDER BY a;
  }
} {{} 200 102 4 {} 220 132 44}
do_test coalesce-1.4 {
  db eval {
    SELECT ifnull(ifnull(b,c),d) FROM t1 ORDER BY a;
  }
} {{} 2 3 4 {} 22 33 44}
do_test coalesce-1.5 {
  db eval {
    SELECT ifnull(b,ifnull(c,d)) FROM t1 ORDER BY a;
  }
} {{} 2 3 4 {} 22 33 44}
do_test coalesce-1.6 {
  db eval {
    SELECT coalesce(b,NOT b,-b,abs(b),lower(b),length(b),min(b,5),b*123,c)
      FROM t1 ORDER BY a;
  }
} {{} 2 3 {} {} 22 33 {}}
do_test coalesce-1.7 {
  db eval {
    SELECT ifnull(nullif(a,4),99)
      FROM t1 ORDER BY a;
  }
} {1 2 3 99 5 6 7 8}
do_test coalesce-1.8 {
  db eval {
pragma vdbe_listing=on;
    SELECT coalesce(
      CASE WHEN b=2 THEN 123 END,
      CASE WHEN b=3 THEN 234 END,
      CASE WHEN c=3 THEN 345 WHEN c=33 THEN 456 END,
      d
    )
    FROM t1 ORDER BY a;
  }
} {{} 123 345 4 {} 99 456 44}


finish_test
