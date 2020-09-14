# 2018 May 19
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

source [file join [file dirname $argv0] pg_common.tcl]

#=========================================================================

start_test window8 "2019 March 01"
ifcapable !windowfunc

execsql_test 1.0 {
  DROP TABLE IF EXISTS t3;
  CREATE TABLE t3(a TEXT, b TEXT, c INTEGER);
  INSERT INTO t3 VALUES
    ('HH', 'bb', 355), ('CC', 'aa', 158), ('BB', 'aa', 399), 
    ('FF', 'bb', 938), ('HH', 'aa', 480), ('FF', 'bb', 870), 
    ('JJ', 'aa', 768), ('JJ', 'aa', 899), ('GG', 'bb', 929), 
    ('II', 'bb', 421), ('GG', 'bb', 844), ('FF', 'bb', 574), 
    ('CC', 'bb', 822), ('GG', 'bb', 938), ('BB', 'aa', 660), 
    ('HH', 'aa', 979), ('BB', 'bb', 792), ('DD', 'aa', 845), 
    ('JJ', 'bb', 354), ('FF', 'bb', 295), ('JJ', 'aa', 234), 
    ('BB', 'bb', 840), ('AA', 'aa', 934), ('EE', 'aa', 113), 
    ('AA', 'bb', 309), ('BB', 'aa', 412), ('AA', 'aa', 911), 
    ('AA', 'bb', 572), ('II', 'aa', 398), ('II', 'bb', 250), 
    ('II', 'aa', 652), ('BB', 'bb', 633), ('AA', 'aa', 239), 
    ('FF', 'aa', 670), ('BB', 'bb', 705), ('HH', 'bb', 963), 
    ('CC', 'bb', 346), ('II', 'bb', 671), ('BB', 'aa', 247), 
    ('AA', 'aa', 223), ('GG', 'aa', 480), ('HH', 'aa', 790), 
    ('FF', 'aa', 208), ('BB', 'bb', 711), ('EE', 'aa', 777), 
    ('DD', 'bb', 716), ('CC', 'aa', 759), ('CC', 'aa', 430), 
    ('CC', 'aa', 607), ('DD', 'bb', 794), ('GG', 'aa', 148), 
    ('GG', 'aa', 634), ('JJ', 'bb', 257), ('DD', 'bb', 959), 
    ('FF', 'bb', 726), ('BB', 'aa', 762), ('JJ', 'bb', 336), 
    ('GG', 'aa', 335), ('HH', 'bb', 330), ('GG', 'bb', 160), 
    ('JJ', 'bb', 839), ('FF', 'aa', 618), ('BB', 'aa', 393), 
    ('EE', 'bb', 629), ('FF', 'aa', 667), ('AA', 'bb', 870), 
    ('FF', 'bb', 102), ('JJ', 'aa', 113), ('DD', 'aa', 224), 
    ('AA', 'bb', 627), ('HH', 'bb', 730), ('II', 'bb', 443), 
    ('HH', 'bb', 133), ('EE', 'bb', 252), ('II', 'bb', 805), 
    ('BB', 'bb', 786), ('EE', 'bb', 768), ('HH', 'bb', 683), 
    ('DD', 'bb', 238), ('DD', 'aa', 256);
}

foreach {tn frame} {
  1  { GROUPS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING }
  2  { GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW }
  3  { GROUPS BETWEEN UNBOUNDED PRECEDING AND 1 FOLLOWING }
  4  { GROUPS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING }
  5  { GROUPS BETWEEN 1 PRECEDING         AND 2 PRECEDING }
  6  { GROUPS BETWEEN 2 PRECEDING         AND 1 PRECEDING }
  7  { GROUPS BETWEEN 3 PRECEDING         AND 1 PRECEDING }
  8  { GROUPS BETWEEN 3 PRECEDING         AND 0 PRECEDING }
  9  { GROUPS BETWEEN 2 PRECEDING         AND CURRENT ROW }
  10 { GROUPS BETWEEN 3 PRECEDING         AND 0 FOLLOWING }
  11 { GROUPS BETWEEN 2 PRECEDING         AND UNBOUNDED FOLLOWING }
  12 { GROUPS BETWEEN CURRENT ROW         AND 0 FOLLOWING }
  13 { GROUPS BETWEEN CURRENT ROW         AND 1 FOLLOWING }
  14 { GROUPS BETWEEN CURRENT ROW         AND 100 FOLLOWING }
  15 { GROUPS BETWEEN CURRENT ROW         AND UNBOUNDED FOLLOWING }
  16 { GROUPS BETWEEN 0 FOLLOWING         AND 0 FOLLOWING }
  17 { GROUPS BETWEEN 1 FOLLOWING         AND 0 FOLLOWING }
  18 { GROUPS BETWEEN 1 FOLLOWING         AND 5 FOLLOWING }
  19 { GROUPS BETWEEN 1 FOLLOWING         AND UNBOUNDED FOLLOWING }

} {
  execsql_test 1.$tn.1 "
    SELECT a, b, sum(c) OVER (ORDER BY a $frame) FROM t3 ORDER BY 1, 2, 3;
  "
  execsql_test 1.$tn.2 "
    SELECT a, b, sum(c) OVER (ORDER BY a,b $frame) FROM t3 ORDER BY 1, 2, 3;
  "
  execsql_test 1.$tn.3 "
    SELECT a, b, rank() OVER (ORDER BY a $frame) FROM t3 ORDER BY 1, 2, 3;
  "
  execsql_test 1.$tn.4 "
    SELECT a, b, max(c) OVER (ORDER BY a,b $frame) FROM t3 ORDER BY 1, 2, 3;
  "
  execsql_test 1.$tn.5 "
    SELECT a, b, min(c) OVER (ORDER BY a,b $frame) FROM t3 ORDER BY 1, 2, 3;
  "

  set f2 "$frame EXCLUDE CURRENT ROW"

  execsql_test 1.$tn.6 "
    SELECT a, b, sum(c) OVER (ORDER BY a $f2) FROM t3 ORDER BY 1, 2, 3;
  "
  execsql_test 1.$tn.7 "
    SELECT a, b, sum(c) OVER (ORDER BY a,b $f2) FROM t3 ORDER BY 1, 2, 3;
  "

  execsql_test 1.$tn.8 "
    SELECT a, b, 
      sum(c) OVER (ORDER BY a $f2),
      sum(c) OVER (ORDER BY a $frame),
      sum(c) OVER (ORDER BY a,b $f2),
      sum(c) OVER (ORDER BY a,b $frame)
    FROM t3 ORDER BY 1, 2, 3;
  "
}


foreach {tn ex} {
  1  { EXCLUDE NO OTHERS }
  2  { EXCLUDE CURRENT ROW }
  3  { EXCLUDE GROUP }
  4  { EXCLUDE TIES }
} {
  execsql_test 2.$tn.1 "
    SELECT row_number() OVER win 
    FROM t3
    WINDOW win AS (
      ORDER BY c, b, a
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING $ex
    )
  "

  execsql_test 2.$tn.2 "
    SELECT nth_value(c, 14) OVER win 
    FROM t3
    WINDOW win AS (
      ORDER BY c, b, a
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING $ex
    )
  "

  execsql_test 2.$tn.3 "
    SELECT min(c) OVER win, max(c) OVER win, sum(c) OVER win FROM t3
    WINDOW win AS (
      ORDER BY c, b, a
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW $ex
    ) ORDER BY a, b, c;
  "
}

==========

execsql_test 3.0 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a REAL, b INTEGER);
  INSERT INTO t1 VALUES
      (5, 10), (10, 20), (13, 26), (13, 26), 
      (15, 30), (20, 40), (22,80), (30, 90);
}

foreach {tn frame} {
  1 { ORDER BY a RANGE BETWEEN 5 PRECEDING AND 5 FOLLOWING }
  2 { ORDER BY a RANGE BETWEEN 10 PRECEDING AND 5 PRECEDING }
  3 { ORDER BY a RANGE BETWEEN 2 FOLLOWING AND 3 FOLLOWING }
  4 { ORDER BY a DESC RANGE BETWEEN 5 PRECEDING AND 5 FOLLOWING }
  5 { ORDER BY a DESC RANGE BETWEEN 10 PRECEDING AND 5 PRECEDING }
  6 { ORDER BY a DESC RANGE BETWEEN 2 FOLLOWING AND 3 FOLLOWING }

  7  { ORDER BY a RANGE BETWEEN 5.1 PRECEDING AND 5.3 FOLLOWING }
  8  { ORDER BY a RANGE BETWEEN 10.2 PRECEDING AND 5.4 PRECEDING }
  9  { ORDER BY a RANGE BETWEEN 2.6 FOLLOWING AND 3.5 FOLLOWING }
  10 { ORDER BY a DESC RANGE BETWEEN 5.7 PRECEDING AND 5.8 FOLLOWING }
  11 { ORDER BY a DESC RANGE BETWEEN UNBOUNDED PRECEDING AND 5.9 PRECEDING }
  12 { ORDER BY a DESC RANGE BETWEEN 2.1 FOLLOWING AND UNBOUNDED FOLLOWING }
  13  { ORDER BY a RANGE 5.1 PRECEDING }
} {
  execsql_test 3.$tn "
    SELECT CAST(a AS INTEGER), sum(b) OVER win FROM t1 WINDOW win AS ($frame)
  "
}

==========

execsql_test 4.0 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER, b INTEGER);
  INSERT INTO t1 VALUES
    (NULL, 1), (NULL, 2), (NULL, 3), (10, 4), (10, 5);
}

execsql_test 4.1.1 {
  SELECT sum(b) OVER (
    ORDER BY a RANGE BETWEEN 5 PRECEDING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1;
}
execsql_test 4.1.2 {
  SELECT sum(b) OVER (
    ORDER BY a DESC RANGE BETWEEN 5 PRECEDING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1;
}

execsql_test 4.2.1 {
  SELECT sum(b) OVER (
    ORDER BY a RANGE BETWEEN 5 FOLLOWING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS FIRST;
}
execsql_test 4.2.2 {
  SELECT sum(b) OVER (
    ORDER BY a RANGE BETWEEN 5 FOLLOWING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}

execsql_test 4.2.3 {
  SELECT sum(b) OVER (
    ORDER BY a DESC RANGE BETWEEN 5 FOLLOWING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS FIRST;
}
execsql_test 4.2.4 {
  SELECT sum(b) OVER (
    ORDER BY a DESC RANGE BETWEEN 5 FOLLOWING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}

execsql_test 4.3.1 {
  SELECT sum(b) OVER (
    ORDER BY a NULLS FIRST RANGE BETWEEN UNBOUNDED PRECEDING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS FIRST;
}
execsql_test 4.3.2 {
  SELECT sum(b) OVER (
    ORDER BY a NULLS LAST RANGE BETWEEN UNBOUNDED PRECEDING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}

execsql_test 4.4.1 {
  SELECT sum(b) OVER (
    ORDER BY a NULLS FIRST ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS FIRST;
}
execsql_test 4.4.2 {
  SELECT sum(b) OVER (
    ORDER BY a NULLS LAST ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}

execsql_test 4.4.3 {
  SELECT sum(b) OVER (
    ORDER BY a DESC NULLS LAST ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS FIRST;
}
execsql_test 4.4.4 {
  SELECT sum(b) OVER (
    ORDER BY a DESC NULLS LAST ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}

execsql_test 4.5.1 {
  SELECT sum(b) OVER (
    ORDER BY a ASC  NULLS LAST RANGE BETWEEN UNBOUNDED PRECEDING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}
execsql_test 4.5.2 {
  SELECT sum(b) OVER (
    ORDER BY a DESC NULLS FIRST RANGE 
    BETWEEN UNBOUNDED PRECEDING AND 10 FOLLOWING
  ) FROM t1 ORDER BY 1 NULLS LAST;
}

==========

execsql_test 5.0 {
  INSERT INTO t3 VALUES
    (NULL, 'bb', 355), (NULL, 'cc', 158), (NULL, 'aa', 399), 
    ('JJ', NULL, 839), ('FF', NULL, 618), ('BB', NULL, 393), 
    (NULL, 'bb', 629), (NULL, NULL, 667), (NULL, NULL, 870);
}

foreach {tn ex} {
  1  { EXCLUDE NO OTHERS }
  2  { EXCLUDE CURRENT ROW }
  3  { EXCLUDE GROUP }
  4  { EXCLUDE TIES }
} {
  foreach {tn2 frame} {
    1 { RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING }
    2 { ORDER BY a NULLS FIRST 
        RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING }
    3 { PARTITION BY coalesce(a, '') 
        RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING }
    4 { ORDER BY a NULLS FIRST GROUPS 6 PRECEDING }
    5 { ORDER BY c NULLS FIRST RANGE BETWEEN 6 PRECEDING AND 7 FOLLOWING }
    6 { ORDER BY c NULLS FIRST RANGE BETWEEN 0 PRECEDING AND 0 FOLLOWING }
    7 { ORDER BY c NULLS FIRST, b NULLS FIRST, a NULLS FIRST
        ROWS BETWEEN 6 PRECEDING AND UNBOUNDED FOLLOWING }

    8 { RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING }
    9 { ORDER BY a NULLS LAST 
        RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING }
   10 { PARTITION BY coalesce(a, '') 
        RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING }
   11 { ORDER BY a NULLS LAST GROUPS 6 PRECEDING }
   12 { ORDER BY c NULLS LAST RANGE BETWEEN 6 PRECEDING AND 7 FOLLOWING }
   13 { ORDER BY c NULLS LAST RANGE BETWEEN 0 PRECEDING AND 0 FOLLOWING }
   14 { ORDER BY c NULLS LAST, b NULLS LAST, a NULLS LAST
        ROWS BETWEEN 6 PRECEDING AND UNBOUNDED FOLLOWING }
  } {
    execsql_test 5.$tn.$tn2.1 "
      SELECT max(c) OVER win,
             min(c) OVER win,
             count(a) OVER win
      FROM t3
      WINDOW win AS ( $frame $ex )
      ORDER BY 1 NULLS FIRST, 2 NULLS FIRST, 3 NULLS FIRST
    "

    execsql_test 5.$tn.$tn2.2 "
      SELECT sum(c) FILTER (WHERE (c%2)!=0) OVER win,
             rank() OVER win,
             dense_rank() OVER win
      FROM t3
      WINDOW win AS ( $frame $ex )
      ORDER BY 1 NULLS FIRST, 2 NULLS FIRST, 3 NULLS FIRST
    "
  }
}

==========

execsql_test 6.0 {
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t2(a TEXT, b INTEGER);
  INSERT INTO t2 VALUES('A', NULL);
  INSERT INTO t2 VALUES('B', NULL);
  INSERT INTO t2 VALUES('C', 1);
}

execsql_test 6.1 {
  SELECT string_agg(a, '.') OVER (
    ORDER BY b NULLS FIRST RANGE BETWEEN 7 PRECEDING AND 2 PRECEDING
  )
  FROM t2
}

execsql_test 6.2 {
  SELECT string_agg(a, '.') OVER (
    ORDER BY b DESC NULLS LAST RANGE BETWEEN 7 PRECEDING AND 2 PRECEDING
  )
  FROM t2
}

==========

execsql_test 7.0 {
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t2(a INTEGER, b INTEGER);

  INSERT INTO t2 VALUES(1, 65);
  INSERT INTO t2 VALUES(2, NULL);
  INSERT INTO t2 VALUES(3, NULL);
  INSERT INTO t2 VALUES(4, NULL);
  INSERT INTO t2 VALUES(5, 66);
  INSERT INTO t2 VALUES(6, 67);
}

foreach {tn f ex} {
  1 sum ""
  2 min ""
  3 sum "EXCLUDE CURRENT ROW"
  4 max "EXCLUDE CURRENT ROW"
} {
execsql_test 7.$tn.1 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS LAST RANGE BETWEEN 6 FOLLOWING AND UNBOUNDED FOLLOWING
  );
"
execsql_test 7.$tn.2 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS LAST RANGE BETWEEN 1 PRECEDING AND 2 PRECEDING
  );
"
execsql_test 7.$tn.3 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS LAST RANGE BETWEEN 2 FOLLOWING AND 1 FOLLOWING
  );
"
execsql_test 7.$tn.4 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS FIRST RANGE BETWEEN 1 PRECEDING AND 2 PRECEDING
  );
"
execsql_test 7.$tn.5 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS FIRST RANGE BETWEEN 2 FOLLOWING AND 1 FOLLOWING
  );
"

execsql_test 7.$tn.6 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS LAST RANGE BETWEEN 1000 PRECEDING AND 2 PRECEDING
  );
"
execsql_test 7.$tn.7 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS LAST RANGE BETWEEN 2000 FOLLOWING AND 1000 FOLLOWING
  );
"
execsql_test 7.$tn.8 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS FIRST RANGE BETWEEN 1000 PRECEDING AND 2000 PRECEDING
  );
"
execsql_test 7.$tn.9 "
  SELECT $f (a) OVER win FROM t2
  WINDOW win AS (
      ORDER BY b NULLS FIRST RANGE BETWEEN 2000 FOLLOWING AND 1000 FOLLOWING
  );
"
}



finish_test


