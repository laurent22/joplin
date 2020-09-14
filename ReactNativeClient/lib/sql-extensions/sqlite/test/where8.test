# 2008 December 23
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
# is testing of where.c. More specifically, the focus is the optimization
# of WHERE clauses that feature the OR operator.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[permutation]=="sorterref"} {
  finish_test
  return
}

# Test organization:
#
#   where8-1.*: Tests to demonstrate simple cases work with a single table
#               in the FROM clause.
#
#   where8-2.*: Tests surrounding virtual tables and the OR optimization.
#
#   where8-3.*: Tests with more than one table in the FROM clause.
# 

proc execsql_status {sql {db db}} {
  set result [uplevel $db eval [list $sql]]
  concat $result [db status step] [db status sort]
}

proc execsql_status2 {sql {db db}} {
  set ::sqlite_search_count 0
  set result [uplevel [list execsql_status $sql $db]]
  concat $result $::sqlite_search_count
}

do_test where8-1.1 {
  execsql {
    CREATE TABLE t1(a, b TEXT, c);
    CREATE INDEX i1 ON t1(a);
    CREATE INDEX i2 ON t1(b);

    INSERT INTO t1 VALUES(1,  'one',   'I');
    INSERT INTO t1 VALUES(2,  'two',   'II');
    INSERT INTO t1 VALUES(3,  'three', 'III');
    INSERT INTO t1 VALUES(4,  'four',  'IV');
    INSERT INTO t1 VALUES(5,  'five',  'V');
    INSERT INTO t1 VALUES(6,  'six',   'VI');
    INSERT INTO t1 VALUES(7,  'seven', 'VII');
    INSERT INTO t1 VALUES(8,  'eight', 'VIII');
    INSERT INTO t1 VALUES(9,  'nine',  'IX');
    INSERT INTO t1 VALUES(10, 'ten',   'X');
  }
} {}

do_test where8-1.2 { 
  execsql_status2 { SELECT c FROM t1 WHERE a = 1 OR b = 'nine' }
} {I IX 0 0 6}

do_test where8-1.3 { 
  execsql_status2 { SELECT c FROM t1 WHERE a > 8 OR b = 'two' }
} {IX X II 0 0 6}

ifcapable like_match_blobs {
  do_test where8-1.4a { 
    execsql_status2 { SELECT c FROM t1 WHERE a > 8 OR b GLOB 't*' }
  } {IX X III II 0 0 10}
  do_test where8-1.5a { 
    execsql_status2 { SELECT c FROM t1 WHERE a > 8 OR b GLOB 'f*' }
  } {IX X V IV 0 0 10}
} else {
  do_test where8-1.4b { 
    execsql_status2 { SELECT c FROM t1 WHERE a > 8 OR b GLOB 't*' }
  } {IX X III II 0 0 9}
  do_test where8-1.5 { 
    execsql_status2 { SELECT c FROM t1 WHERE a > 8 OR b GLOB 'f*' }
  } {IX X V IV 0 0 9}
}

do_test where8-1.6 { 
  execsql_status { SELECT c FROM t1 WHERE a = 1 OR b = 'three' ORDER BY rowid }
} {I III 0 1}

do_test where8-1.7 { 
  execsql_status { SELECT c FROM t1 WHERE a = 1 OR b = 'three' ORDER BY a }
} {I III 0 1}

do_test where8-1.8 {
  # 18 searches. 9 on the index cursor and 9 on the table cursor.
  execsql_status2 { SELECT c FROM t1 WHERE a > 1 AND c LIKE 'I%' }
} {II III IV IX 0 0 18}

do_test where8-1.9 {
  execsql_status2 { SELECT c FROM t1 WHERE a >= 9 OR b <= 'eight' }
} {IX X VIII 0 0 7}

do_test where8-1.10 {
  execsql_status2 { 
    SELECT c FROM t1 WHERE (a >= 9 AND c != 'X') OR b <= 'eight' 
  }
} {IX VIII 0 0 7}

do_test where8-1.11 {
  execsql_status2 { 
    SELECT c FROM t1 WHERE (a >= 4 AND a <= 6) OR b = 'nine' 
  }
} {IV V VI IX 0 0 10}

do_test where8-1.12.1 {
  execsql_status2 { 
    SELECT c FROM t1 WHERE a IN(1, 2, 3) OR a = 5
  }
} {I II III V 0 0 14}

do_test where8-1.12.2 {
  execsql_status2 { 
    SELECT c FROM t1 WHERE +a IN(1, 2, 3) OR +a = 5
  }
} {I II III V 9 0 9}

do_test where8-1.13 {
  execsql_status2 {
    SELECT c FROM t1
    WHERE a = 2 OR b = 'three' OR a = 4 OR b = 'five' OR a = 6
    ORDER BY rowid
  }
} {II III IV V VI 0 1 18}
do_test where8-1.14 {
  execsql_status2 {
    SELECT c FROM t1
    WHERE 
      a = 2 OR b = 'three' OR a = 4 OR b = 'five' OR a = 6 OR
      b = 'seven' OR a = 8 OR b = 'nine' OR a = 10
    ORDER BY rowid
  }
} {II III IV V VI VII VIII IX X 0 1 33}

do_test where8-1.15 {
  execsql_status2 {
    SELECT c FROM t1 WHERE 
      a BETWEEN 2 AND 4 OR b = 'nine'
    ORDER BY rowid
  }
} {II III IV IX 0 1 12}


#--------------------------------------------------------------------------
# Tests where8-2.*: Virtual tables
# 

if 0 {
ifcapable vtab {
  # Register the 'echo' module used for testing virtual tables.
  #
  register_echo_module [sqlite3_connection_pointer db]

  do_test where8-2.1 {
    execsql {
      CREATE VIRTUAL TABLE e1 USING echo(t1);
      SELECT b FROM e1;
    }
  } {one two three four five six seven eight nine ten}

  do_test where8-2.2.1 {
    set echo_module ""
    execsql {
      SELECT c FROM e1 WHERE a=1 OR b='three';
    }
  } {I III}
  do_test where8-2.2.2 {
    set echo_module
  } {TODO: What should this be?}
}
}

#--------------------------------------------------------------------------
# Tests where8-3.*: Cases with multiple tables in the FROM clause.
# 
do_test where8-3.1 {
  execsql {
    CREATE TABLE t2(d, e, f);
    CREATE INDEX i3 ON t2(d);
    CREATE INDEX i4 ON t2(e);

    INSERT INTO t2 VALUES(1,  NULL,         'I');
    INSERT INTO t2 VALUES(2,  'four',       'IV');
    INSERT INTO t2 VALUES(3,  NULL,         'IX');
    INSERT INTO t2 VALUES(4,  'sixteen',    'XVI');
    INSERT INTO t2 VALUES(5,  NULL,         'XXV');
    INSERT INTO t2 VALUES(6,  'thirtysix',  'XXXVI');
    INSERT INTO t2 VALUES(7,  'fortynine',  'XLIX');
    INSERT INTO t2 VALUES(8,  'sixtyeight', 'LXIV');
    INSERT INTO t2 VALUES(9,  'eightyone',  'LXXXIX');
    INSERT INTO t2 VALUES(10, NULL,         'C');
  }
} {}

do_test where8-3.2 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE b=e
  }
} {4 2 9 0}

do_test where8-3.3 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE (a = 2 OR a = 3) AND d = 6
  }
} {2 6 3 6 0 0}

do_test where8-3.4 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE (a = 2 OR a = 3) AND d = a
  }
} {2 2 3 3 0 0}

do_test where8-3.5 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE (a = 2 OR a = 3) AND (d = +a OR e = 'sixteen')
     ORDER BY +a, +d;
  }
} {2 2 2 4 3 3 3 4 0 1}

do_test where8-3.6 {
  # The first part of the WHERE clause in this query, (a=2 OR a=3) is
  # transformed into "a IN (2, 3)". This is why the sort is required.
  #
  execsql_status {
    SELECT a, d 
    FROM t1, t2 
    WHERE (a = 2 OR a = 3) AND (d = +a OR e = 'sixteen')
    ORDER BY t1.rowid
  }
} {2 2 2 4 3 3 3 4 0 1}
do_test where8-3.7 {
  execsql_status {
    SELECT a, d 
    FROM t1, t2 
    WHERE a = 2 AND (d = a OR e = 'sixteen')
    ORDER BY t1.rowid
  }
} {/2 2 2 4 0 [01]/}
do_test where8-3.8 {
  execsql_status {
    SELECT a, d 
    FROM t1, t2 
    WHERE (a = 2 OR b = 'three') AND (d = a OR e = 'sixteen')
    ORDER BY t1.rowid
  }
} {2 2 2 4 3 3 3 4 0 1}

do_test where8-3.9 {
  # The "OR c = 'IX'" term forces a linear scan.
  execsql_status {
    SELECT a, d 
    FROM t1, t2 
    WHERE (a = 2 OR b = 'three' OR c = 'IX') AND (d = a OR e = 'sixteen')
    ORDER BY t1.rowid
  }
} {2 2 2 4 3 3 3 4 9 9 9 4 9 0}

do_test where8-3.10 {
  execsql_status {
    SELECT d FROM t2 WHERE e IS NULL OR e = 'four'
  }
} {1 3 5 10 2 0 0}

do_test where8-3.11 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE (a=d OR b=e) AND a<5 ORDER BY a
  }
} {1 1 2 2 3 3 4 2 4 4 0 0}
do_test where8-3.12 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE (a=d OR b=e) AND +a<5 ORDER BY a
  }
} {1 1 2 2 3 3 4 2 4 4 9 0}
do_test where8-3.13 {
  execsql_status {
    SELECT a, d FROM t1, t2 WHERE (a=d OR b=e) AND +a<5
  }
} {1 1 2 2 3 3 4 2 4 4 9 0}

do_test where8-3.14 {
  execsql_status {
    SELECT c FROM t1 WHERE a > (SELECT d FROM t2 WHERE e = b) OR a = 5
  }
} {IV V 9 0}

do_test where8-3.15 {
  execsql_status {
    SELECT c FROM t1, t2 WHERE a BETWEEN 1 AND 2 OR a = (
      SELECT sum(e IS NULL) FROM t2 AS inner WHERE t2.d>inner.d
    )
    ORDER BY c
  }
} {I I I I I I I I I I II II II II II II II II II II III III III III III 9 1}


do_test where8-3.21 {
  execsql_status {
    SELECT a, d FROM t1, (t2) WHERE (a=d OR b=e) AND a<5 ORDER BY a
  }
} {1 1 2 2 3 3 4 2 4 4 0 0}
do_test where8-3.21.1 {
  execsql_status {
    SELECT a, d FROM t1, ((t2)) AS t3 WHERE (a=d OR b=e) AND a<5 ORDER BY a
  }
} {1 1 2 2 3 3 4 2 4 4 0 0}
if {[permutation] != "no_optimization"} {
do_test where8-3.21.2 {
  execsql_status {
    SELECT a, d FROM t1, ((SELECT * FROM t2)) AS t3 WHERE (a=d OR b=e) AND a<5 ORDER BY a
  }
} {1 1 2 2 3 3 4 2 4 4 0 0}
}
do_test where8-3.22 {
  execsql_status {
    SELECT a, d FROM ((((((t1))), (((t2))))))
     WHERE (a=d OR b=e) AND a<5 ORDER BY a
  }
} {1 1 2 2 3 3 4 2 4 4 0 0}
if {[permutation] != "no_optimization"} {
do_test where8-3.23 {
  execsql_status {
    SELECT * FROM ((SELECT * FROM t2)) AS t3;
  }
} {1 {} I 2 four IV 3 {} IX 4 sixteen XVI 5 {} XXV 6 thirtysix XXXVI 7 fortynine XLIX 8 sixtyeight LXIV 9 eightyone LXXXIX 10 {} C 9 0}
}

#-----------------------------------------------------------------------
# The following tests - where8-4.* - verify that adding or removing 
# indexes does not change the results returned by various queries.
#
do_test where8-4.1 {
  execsql {
    BEGIN;
    CREATE TABLE t3(a INTEGER, b REAL, c TEXT);
    CREATE TABLE t4(f INTEGER, g REAL, h TEXT);
    INSERT INTO t3 VALUES('hills', NULL, 1415926535);
    INSERT INTO t3 VALUES('and', 'of', NULL);
    INSERT INTO t3 VALUES('have', 'towering', 53594.08128);
    INSERT INTO t3 VALUES(NULL, 45.64856692, 'Not');
    INSERT INTO t3 VALUES('same', 5028841971, NULL);
    INSERT INTO t3 VALUES('onlookers', 'in', 8214808651);
    INSERT INTO t3 VALUES(346.0348610, 2643383279, NULL);
    INSERT INTO t3 VALUES(1415926535, 'of', 'are');
    INSERT INTO t3 VALUES(NULL, 0.4811174502, 'snapshots');
    INSERT INTO t3 VALUES('over', 'the', 8628034825);
    INSERT INTO t3 VALUES(8628034825, 66.59334461, 2847564.823);
    INSERT INTO t3 VALUES('onlookers', 'same', 'and');
    INSERT INTO t3 VALUES(NULL, 'light', 6939937510);
    INSERT INTO t3 VALUES('from', 'their', 'viewed');
    INSERT INTO t3 VALUES('from', 'Alpine', 'snapshots');
    INSERT INTO t3 VALUES('from', 'sometimes', 'unalike');
    INSERT INTO t3 VALUES(1339.360726, 'light', 'have');
    INSERT INTO t3 VALUES(6939937510, 3282306647, 'other');
    INSERT INTO t3 VALUES('paintings', 8628034825, 'all');
    INSERT INTO t3 VALUES('paintings', NULL, 'same');
    INSERT INTO t3 VALUES('Alpine', 378678316.5, 'unalike');
    INSERT INTO t3 VALUES('Alpine', NULL, 'same');
    INSERT INTO t3 VALUES(1339.360726, 2847564.823, 'over');
    INSERT INTO t3 VALUES('villages', 'their', 'have');
    INSERT INTO t3 VALUES('unalike', 'remarkably', 'in');
    INSERT INTO t3 VALUES('and', 8979323846, 'and');
    INSERT INTO t3 VALUES(NULL, 1415926535, 'an');
    INSERT INTO t3 VALUES(271.2019091, 8628034825, 0.4811174502);
    INSERT INTO t3 VALUES('all', 3421170679, 'the');
    INSERT INTO t3 VALUES('Not', 'and', 1415926535);
    INSERT INTO t3 VALUES('of', 'other', 'light');
    INSERT INTO t3 VALUES(NULL, 'towering', 'Not');
    INSERT INTO t3 VALUES(346.0348610, NULL, 'other');
    INSERT INTO t3 VALUES('Not', 378678316.5, NULL);
    INSERT INTO t3 VALUES('snapshots', 8628034825, 'of');
    INSERT INTO t3 VALUES(3282306647, 271.2019091, 'and');
    INSERT INTO t3 VALUES(50.58223172, 378678316.5, 5028841971);
    INSERT INTO t3 VALUES(50.58223172, 2643383279, 'snapshots');
    INSERT INTO t3 VALUES('writings', 8979323846, 8979323846);
    INSERT INTO t3 VALUES('onlookers', 'his', 'in');
    INSERT INTO t3 VALUES('unalike', 8628034825, 1339.360726);
    INSERT INTO t3 VALUES('of', 'Alpine', 'and');
    INSERT INTO t3 VALUES('onlookers', NULL, 'from');
    INSERT INTO t3 VALUES('writings', 'it', 1339.360726);
    INSERT INTO t3 VALUES('it', 'and', 'villages');
    INSERT INTO t3 VALUES('an', 'the', 'villages');
    INSERT INTO t3 VALUES(8214808651, 8214808651, 'same');
    INSERT INTO t3 VALUES(346.0348610, 'light', 1415926535);
    INSERT INTO t3 VALUES(NULL, 8979323846, 'and');
    INSERT INTO t3 VALUES(NULL, 'same', 1339.360726);
    INSERT INTO t4 VALUES('his', 'from', 'an');
    INSERT INTO t4 VALUES('snapshots', 'or', NULL);
    INSERT INTO t4 VALUES('Alpine', 'have', 'it');
    INSERT INTO t4 VALUES('have', 'peak', 'remarkably');
    INSERT INTO t4 VALUES('hills', NULL, 'Not');
    INSERT INTO t4 VALUES('same', 'from', 2643383279);
    INSERT INTO t4 VALUES('have', 'angle', 8628034825);
    INSERT INTO t4 VALUES('sometimes', 'it', 2847564.823);
    INSERT INTO t4 VALUES(0938446095, 'peak', 'of');
    INSERT INTO t4 VALUES(8628034825, 'and', 'same');
    INSERT INTO t4 VALUES('and', 271.2019091, 'their');
    INSERT INTO t4 VALUES('the', 'of', 'remarkably');
    INSERT INTO t4 VALUES('and', 3421170679, 1415926535);
    INSERT INTO t4 VALUES('and', 'in', 'all');
    INSERT INTO t4 VALUES(378678316.5, 0.4811174502, 'snapshots');
    INSERT INTO t4 VALUES('it', 'are', 'have');
    INSERT INTO t4 VALUES('angle', 'snapshots', 378678316.5);
    INSERT INTO t4 VALUES('from', 1415926535, 8628034825);
    INSERT INTO t4 VALUES('snapshots', 'angle', 'have');
    INSERT INTO t4 VALUES(3421170679, 0938446095, 'Not');
    INSERT INTO t4 VALUES('peak', NULL, 0.4811174502);
    INSERT INTO t4 VALUES('same', 'have', 'Alpine');
    INSERT INTO t4 VALUES(271.2019091, 66.59334461, 0938446095);
    INSERT INTO t4 VALUES(8979323846, 'his', 'an');
    INSERT INTO t4 VALUES(NULL, 'and', 3282306647);
    INSERT INTO t4 VALUES('remarkably', NULL, 'Not');
    INSERT INTO t4 VALUES('villages', 4543.266482, 'his');
    INSERT INTO t4 VALUES(2643383279, 'paintings', 'onlookers');
    INSERT INTO t4 VALUES(1339.360726, 'of', 'the');
    INSERT INTO t4 VALUES('peak', 'other', 'peak');
    INSERT INTO t4 VALUES('it', 'or', 8979323846);
    INSERT INTO t4 VALUES('onlookers', 'Not', 'towering');
    INSERT INTO t4 VALUES(NULL, 'peak', 'Not');
    INSERT INTO t4 VALUES('of', 'have', 6939937510);
    INSERT INTO t4 VALUES('light', 'hills', 0.4811174502);
    INSERT INTO t4 VALUES(5028841971, 'Not', 'it');
    INSERT INTO t4 VALUES('and', 'Not', NULL);
    INSERT INTO t4 VALUES(346.0348610, 'villages', NULL);
    INSERT INTO t4 VALUES(8979323846, NULL, 6939937510);
    INSERT INTO t4 VALUES('an', 'light', 'peak');
    INSERT INTO t4 VALUES(5028841971, 6939937510, 'light');
    INSERT INTO t4 VALUES('sometimes', 'peak', 'peak');
    INSERT INTO t4 VALUES(378678316.5, 5028841971, 'an');
    INSERT INTO t4 VALUES(378678316.5, 'his', 'Alpine');
    INSERT INTO t4 VALUES('from', 'of', 'all');
    INSERT INTO t4 VALUES(0938446095, 'same', NULL);
    INSERT INTO t4 VALUES(0938446095, 'Alpine', NULL);
    INSERT INTO t4 VALUES('his', 'of', 378678316.5);
    INSERT INTO t4 VALUES(271.2019091, 'viewed', 3282306647);
    INSERT INTO t4 VALUES('hills', 'all', 'peak');
    CREATE TABLE t5(s);
    INSERT INTO t5 VALUES('tab-t5');
    CREATE TABLE t6(t);
    INSERT INTO t6 VALUES(123456);
    COMMIT;
  }
} {}

catch {unset results}
catch {unset A}
catch {unset B}

set A 2
foreach idxsql {
  { 
    /* No indexes */ 
  } {
    CREATE INDEX i5 ON t3(a);
  } {
    CREATE INDEX i5 ON t3(a, b);
    CREATE INDEX i6 ON t4(f);
  } {
    CREATE UNIQUE INDEX i5 ON t3(a, b);
    CREATE INDEX i7 ON t3(c);
    CREATE INDEX i6 ON t4(f);
    CREATE INDEX i8 ON t4(h);
  } {
    CREATE INDEX i5 ON t3(a, b, c);
    CREATE INDEX i6 ON t4(f, g, h);
    CREATE INDEX i7 ON t3(c, b, a);
    CREATE INDEX i8 ON t4(h, g, f);
  }
} {

  execsql {
    DROP INDEX IF EXISTS i5;
    DROP INDEX IF EXISTS i6;
    DROP INDEX IF EXISTS i7;
    DROP INDEX IF EXISTS i8;
  }
  execsql $idxsql

  foreach {B sql} {
 1  { SELECT * FROM t3 WHERE c LIKE b }
 2  { SELECT * FROM t3 WHERE c||'' LIKE 'the%' }
 3  { SELECT * FROM t3 WHERE rowid LIKE '12%' }
 4  { SELECT * FROM t3 WHERE +c LIKE 'the%' }
 5  { SELECT * FROM t3 WHERE c LIKE 'the%' }
 6  { SELECT * FROM t3 WHERE c GLOB '*llo' }

 7  { SELECT * FROM t3 WHERE a = 'angle' }
 8  { SELECT * FROM t3 WHERE a = 'it' OR b = 6939937510 }
 9  { SELECT * FROM t3, t4 WHERE a = 'painting' OR a = 'are' OR a = f }
10  { SELECT * FROM t3, t4 WHERE a = 'all' OR a = 'and' OR a = h }
11  { SELECT * FROM t3, t4 WHERE a < 'of' OR b > 346 AND c IS NULL }
12  { SELECT * FROM t3, t4 WHERE 'the' > a OR b > 'have' AND c = 1415926535 }

13  { SELECT * FROM t3 WHERE a BETWEEN 'one' AND 'two' OR a = 3421170679 }
14  { SELECT * FROM t3 WHERE a BETWEEN 'one' AND 'two' OR a IS NULL }
15  { SELECT * FROM t3 WHERE c > 'one' OR c >= 'one' OR c LIKE 'one%' }
16  { SELECT * FROM t3 WHERE c > 'one' OR c = c OR c = a }
17  { SELECT * FROM t3 WHERE c IS NULL OR a >= 'peak' }
18  { SELECT * FROM t3 WHERE c IN ('other', 'all', 'snapshots') OR a>1 }
19  { SELECT * FROM t3 WHERE c IN ('other', 'all', 'snapshots') AND a>1 }
20  { SELECT * FROM t3 WHERE c IS NULL AND a>'one' }
21  { SELECT * FROM t3 WHERE c IS NULL OR a>'one' }
22  { SELECT * FROM t3 WHERE b = b AND a > 'are' }
23  { SELECT * FROM t3 WHERE c <= b OR b < 'snapshots' }
24  { SELECT * FROM t3 WHERE 'onlookers' >= c AND a <= b OR b = 'angle' }
25  { SELECT * FROM t3 WHERE b = 'from' }
26  { SELECT * FROM t3 WHERE b = 4543.266482 }
27  { SELECT * FROM t3 WHERE c < 3282306647 }
28  { SELECT * FROM t3 WHERE c IS NULL AND b >= c }
29  { SELECT * FROM t3 WHERE b > 0.4811174502 AND c = 'other' AND 'viewed' > a }
30  { SELECT * FROM t3 WHERE c = 'peak' }
31  { SELECT * FROM t3 WHERE c < 53594.08128 OR c <= b }
32  { SELECT * FROM t3 WHERE 'writings' <= b }
33  { SELECT * FROM t3 WHERE 2643383279 = b OR c < b AND b <= 3282306647 }
34  { SELECT * FROM t3 WHERE a IS NULL }
35  { SELECT * FROM t3 WHERE 'writings' = a OR b = 378678316.5 }
36  { SELECT * FROM t3 WHERE 'and' >= c }
37  { SELECT * FROM t3 WHERE c < 'from' }
38  { SELECT * FROM t3 WHERE 'his' < c OR b < b }
39  { SELECT * FROM t3 WHERE 53594.08128 = b AND c >= b }
40  { SELECT * FROM t3 WHERE 'unalike' < c AND 'are' >= c AND a <= b }
41  { SELECT * FROM t3 WHERE b >= 4543.266482 OR 'Alpine' > a OR 271.2019091 <= a }
42  { SELECT * FROM t3 WHERE b = c }
43  { SELECT * FROM t3 WHERE c > a AND b < 'all' }
44  { SELECT * FROM t3 WHERE c BETWEEN 'hills' AND 'snapshots' AND c <= 'the' OR c = a }
45  { SELECT * FROM t3 WHERE b > c AND c >= 'hills' }
46  { SELECT * FROM t3 WHERE b > 'or' OR a <= 'hills' OR c IS NULL }
47  { SELECT * FROM t3 WHERE c > b OR b BETWEEN 1339.360726 AND 'onlookers' OR 1415926535 >= b }
48  { SELECT * FROM t3 WHERE a IS NULL }
49  { SELECT * FROM t3 WHERE a > 'other' }
50  { SELECT * FROM t3 WHERE 'the' <= c AND a <= c }
51  { SELECT * FROM t3 WHERE 346.0348610 = a AND c = b }
52  { SELECT * FROM t3 WHERE c BETWEEN 50.58223172 AND 'same' AND a < b }
53  { SELECT * FROM t3 WHERE 'Alpine' <= b AND c >= 'angle' OR b <= 271.2019091 }
54  { SELECT * FROM t3 WHERE a < a AND 1415926535 > b }
55  { SELECT * FROM t3 WHERE c > a AND 'have' >= c }
56  { SELECT * FROM t3 WHERE b <= b AND c > b }
57  { SELECT * FROM t3 WHERE a IS NULL AND c <= c }
58  { SELECT * FROM t3 WHERE b < c OR b = c }
59  { SELECT * FROM t3 WHERE c < b AND b >= 'it' }
60  { SELECT * FROM t3 WHERE a = b AND a <= b OR b >= a }
61  { SELECT * FROM t3 WHERE b = c }
62  { SELECT * FROM t3 WHERE c BETWEEN 'the' AND 271.2019091 OR c <= 3282306647 AND c >= b }
63  { SELECT * FROM t3 WHERE c >= c AND c < 'writings' }
64  { SELECT * FROM t3 WHERE c <= 3282306647 AND b > a OR 'unalike' <= a }
65  { SELECT * FROM t3 WHERE a > c }
66  { SELECT * FROM t3 WHERE c = 'it' OR b >= b }
67  { SELECT * FROM t3 WHERE c = a OR b < c }
68  { SELECT * FROM t3 WHERE b > a }
69  { SELECT * FROM t3 WHERE a < b OR a > 4543.266482 OR 'same' = b }
70  { SELECT * FROM t3 WHERE c < c OR b <= c OR a <= b }
71  { SELECT * FROM t3 WHERE c > a }
72  { SELECT * FROM t3 WHERE c > b }
73  { SELECT * FROM t3 WHERE b <= a }
74  { SELECT * FROM t3 WHERE 3282306647 < b AND a >= 'or' OR a >= 378678316.5 }
75  { SELECT * FROM t3 WHERE 50.58223172 <= c OR c = c AND b < b }
76  { SELECT * FROM t3 WHERE 'and' < b OR b < c OR c > 1339.360726 }
77  { SELECT * FROM t3 WHERE b <= c }
78  { SELECT * FROM t3 WHERE 'in' <= c }
79  { SELECT * FROM t3 WHERE c <= b AND a > a AND c < b }
80  { SELECT * FROM t3 WHERE 'over' < b }
81  { SELECT * FROM t3 WHERE b >= b OR b < c OR a < b }
82  { SELECT * FROM t3 WHERE 'towering' <= b OR 'towering' = a AND c > b }
83  { SELECT * FROM t3 WHERE 'peak' = a OR b BETWEEN 2643383279 AND 'the' }
84  { SELECT * FROM t3 WHERE 'an' < c AND c > 'the' AND c IS NULL }
85  { SELECT * FROM t3 WHERE a <= 'sometimes' AND a BETWEEN 'unalike' AND 1339.360726 }
86  { SELECT * FROM t3 WHERE 1339.360726 < c AND c IS NULL }
87  { SELECT * FROM t3 WHERE b > 'the' }
88  { SELECT * FROM t3 WHERE 'and' = a }
89  { SELECT * FROM t3 WHERE b >= b }
90  { SELECT * FROM t3 WHERE b >= 8979323846 }
91  { SELECT * FROM t3 WHERE c <= a }
92  { SELECT * FROM t3 WHERE a BETWEEN 'have' AND 'light' OR a > b OR a >= 378678316.5 }
93  { SELECT * FROM t3 WHERE c > 3282306647 }
94  { SELECT * FROM t3 WHERE b > c }
95  { SELECT * FROM t3 WHERE b >= a AND 'villages' > a AND b >= c }
96  { SELECT * FROM t3 WHERE 'angle' > a }
97  { SELECT * FROM t3 WHERE 'paintings' >= a }
98  { SELECT * FROM t3 WHERE 'or' >= c }
99  { SELECT * FROM t3 WHERE c < b }


101  { SELECT * FROM t3, t4 WHERE f < 'sometimes' OR 'over' <= g AND h < 1415926535 }
102  { SELECT * FROM t3, t4 WHERE h >= 'from' AND h < 6939937510 OR g > h }
103  { SELECT * FROM t3, t4 WHERE c <= h AND g = h AND c >= 'all' }
104  { SELECT * FROM t3, t4 WHERE c = a }
105  { SELECT * FROM t3, t4 WHERE 'of' >= h }
106  { SELECT * FROM t3, t4 WHERE f >= b AND a < g AND h < 'and' }
107  { SELECT * FROM t3, t4 WHERE f <= 8628034825 AND 0938446095 >= b }
108  { SELECT * FROM t3, t4 WHERE a < 'the' }
109  { SELECT * FROM t3, t4 WHERE f = 'sometimes' OR b < 'of' }
110  { SELECT * FROM t3, t4 WHERE c IS NULL }
111  { SELECT * FROM t3, t4 WHERE 'have' = b OR g <= 346.0348610 }
112  { SELECT * FROM t3, t4 WHERE f > b AND b <= h }
113  { SELECT * FROM t3, t4 WHERE f > c OR 'the' = a OR 50.58223172 = a }
114  { SELECT * FROM t3, t4 WHERE 2643383279 <= a AND c = a }
115  { SELECT * FROM t3, t4 WHERE h >= b AND 'it' <= b }
116  { SELECT * FROM t3, t4 WHERE g BETWEEN 'from' AND 'peak' }
117  { SELECT * FROM t3, t4 WHERE 'their' > a AND g > b AND f <= c }
118  { SELECT * FROM t3, t4 WHERE h = 5028841971 AND 'unalike' <= f }
119  { SELECT * FROM t3, t4 WHERE c IS NULL AND a = 3282306647 OR a <= 'Alpine' }
120  { SELECT * FROM t3, t4 WHERE 'sometimes' <= f OR 8214808651 >= a AND b <= 53594.08128 }
121  { SELECT * FROM t3, t4 WHERE 6939937510 <= f OR c < f OR 'sometimes' = c }
122  { SELECT * FROM t3, t4 WHERE b < 'onlookers' AND 'paintings' = g AND c <= h }
123  { SELECT * FROM t3, t4 WHERE a BETWEEN 'all' AND 'from' OR c > 346.0348610 }
124  { SELECT * FROM t3, t4 WHERE 'from' <= b OR a BETWEEN 53594.08128 AND 'their' AND c > a }
125  { SELECT * FROM t3, t4 WHERE h = 2643383279 }
126  { SELECT * FROM t3, t4 WHERE a <= 'the' }
127  { SELECT * FROM t3, t4 WHERE h <= c }
128  { SELECT * FROM t3, t4 WHERE g <= 346.0348610 AND 66.59334461 >= f AND f <= f }
129  { SELECT * FROM t3, t4 WHERE g >= c OR 'in' < b OR b > g }
130  { SELECT * FROM t3, t4 WHERE 'over' > g AND b BETWEEN 'unalike' AND 'remarkably' }
131  { SELECT * FROM t3, t4 WHERE h <= 2847564.823 }
132  { SELECT * FROM t3, t4 WHERE h <= 'remarkably' AND 4543.266482 > h }
133  { SELECT * FROM t3, t4 WHERE a >= c AND 'it' > g AND c < c }
134  { SELECT * FROM t3, t4 WHERE h <= 66.59334461 AND b > 3421170679 }
135  { SELECT * FROM t3, t4 WHERE h < 'are' OR f BETWEEN 0938446095 AND 'are' OR b = b }
136  { SELECT * FROM t3, t4 WHERE h = a OR 66.59334461 <= f }
137  { SELECT * FROM t3, t4 WHERE f > 'of' OR h <= h OR a = f }
138  { SELECT * FROM t3, t4 WHERE 'other' >= g }
139  { SELECT * FROM t3, t4 WHERE b <= 3421170679 }
140  { SELECT * FROM t3, t4 WHERE 'all' = f AND 4543.266482 = b OR f BETWEEN 'and' AND 'angle' }
141  { SELECT * FROM t3, t4 WHERE 'light' = f OR h BETWEEN 'remarkably' AND 1415926535 }
142  { SELECT * FROM t3, t4 WHERE 'hills' = f OR 'the' >= f }
143  { SELECT * FROM t3, t4 WHERE a > 346.0348610 }
144  { SELECT * FROM t3, t4 WHERE 5028841971 = h }
145  { SELECT * FROM t3, t4 WHERE b >= c AND 'the' >= g OR 45.64856692 <= g }
146  { SELECT * FROM t3, t4 WHERE c < 5028841971 }
147  { SELECT * FROM t3, t4 WHERE a > a }
148  { SELECT * FROM t3, t4 WHERE c = 'snapshots' }
149  { SELECT * FROM t3, t4 WHERE h > 1339.360726 AND 'and' > c }
150  { SELECT * FROM t3, t4 WHERE 'and' > g OR 'sometimes' = c }
151  { SELECT * FROM t3, t4 WHERE g >= 'the' AND b >= 'onlookers' }
152  { SELECT * FROM t3, t4 WHERE h BETWEEN 'other' AND 2643383279 }
153  { SELECT * FROM t3, t4 WHERE 'it' = b }
154  { SELECT * FROM t3, t4 WHERE f = c OR c BETWEEN 'and' AND 0.4811174502 }
155  { SELECT * FROM t3, t4 WHERE b <= 'sometimes' OR c <= 0938446095 }
156  { SELECT * FROM t3, t4 WHERE 'and' <= b }
157  { SELECT * FROM t3, t4 WHERE g > a AND f = 'the' AND b < a }
158  { SELECT * FROM t3, t4 WHERE a < 'an' }
159  { SELECT * FROM t3, t4 WHERE a BETWEEN 'his' AND 'same' OR 8628034825 > f }
160  { SELECT * FROM t3, t4 WHERE b = 'peak' }
161  { SELECT * FROM t3, t4 WHERE f IS NULL AND a >= h }
162  { SELECT * FROM t3, t4 WHERE a IS NULL OR 2643383279 = c }
163  { SELECT * FROM t3, t4 WHERE b >= 5028841971 AND f < c AND a IS NULL }
164  { SELECT * FROM t3, t4 WHERE a >= g }
165  { SELECT * FROM t3, t4 WHERE c IS NULL }
166  { SELECT * FROM t3, t4 WHERE h >= h }
167  { SELECT * FROM t3, t4 WHERE 'over' <= h }
168  { SELECT * FROM t3, t4 WHERE b < 4543.266482 OR b = 2643383279 OR 8628034825 < b }
169  { SELECT * FROM t3, t4 WHERE g >= 6939937510 }
170  { SELECT * FROM t3, t4 WHERE 'or' < a OR b < g }
171  { SELECT * FROM t3, t4 WHERE h < 'hills' OR 'and' > g }
172  { SELECT * FROM t3, t4 WHERE 'from' > f OR f <= f }
173  { SELECT * FROM t3, t4 WHERE 'viewed' > b AND f < c }
174  { SELECT * FROM t3, t4 WHERE 'of' <= a }
175  { SELECT * FROM t3, t4 WHERE f > 0938446095 }
176  { SELECT * FROM t3, t4 WHERE a = g }
177  { SELECT * FROM t3, t4 WHERE g >= b AND f BETWEEN 'peak' AND 'and' }
178  { SELECT * FROM t3, t4 WHERE g = a AND 'it' > f }
179  { SELECT * FROM t3, t4 WHERE a <= b OR 'from' > f }
180  { SELECT * FROM t3, t4 WHERE f < 'and' }
181  { SELECT * FROM t3, t4 WHERE 6939937510 < b OR 'sometimes' < h }
182  { SELECT * FROM t3, t4 WHERE f > g AND f < 'peak' }
183  { SELECT * FROM t3, t4 WHERE a <= 53594.08128 AND c <= f AND f >= c }
184  { SELECT * FROM t3, t4 WHERE f = c OR 'it' > b OR g BETWEEN 'the' AND 'all' }
185  { SELECT * FROM t3, t4 WHERE c <= g OR a = h }
186  { SELECT * FROM t3, t4 WHERE 'same' = b OR c >= 2643383279 }
187  { SELECT * FROM t3, t4 WHERE h <= g OR c > 66.59334461 OR a <= f }
188  { SELECT * FROM t3, t4 WHERE b < c AND f = 'writings' }
189  { SELECT * FROM t3, t4 WHERE b < a }
190  { SELECT * FROM t3, t4 WHERE c >= f OR c = 'and' }
191  { SELECT * FROM t3, t4 WHERE f >= 'peak' AND g > f AND h > g }
192  { SELECT * FROM t3, t4 WHERE a >= 8979323846 AND 'same' > b OR c = 'and' }
193  { SELECT * FROM t3, t4 WHERE c >= g OR 'writings' >= c AND b = 'all' }
194  { SELECT * FROM t3, t4 WHERE 'remarkably' < g }
195  { SELECT * FROM t3, t4 WHERE a BETWEEN 'or' AND 'paintings' AND g <= f }
196  { SELECT * FROM t3, t4 WHERE 0938446095 > b OR g <= a OR h > b }
197  { SELECT * FROM t3, t4 WHERE g = 2643383279 AND f = g }
198  { SELECT * FROM t3, t4 WHERE g < 8979323846 }
199  { SELECT * FROM t3, t4 WHERE 'are' <= b }
200  { SELECT * FROM t3, t4 WHERE (a=1415926535 AND f=8628034825)
                               OR (a=6939937510 AND f=2643383279) }
201  { SELECT * FROM t3, t4, t5, t6
        WHERE (a=1415926535 AND f=8628034825 AND s!='hello' AND t!=5)
           OR (a=6939937510 AND f=2643383279 AND s='tab-t5' AND t=123456) }
202  { SELECT * FROM t3, t4, t5, t6
        WHERE (a=1415926535 AND f=8628034825 AND s!='hello' AND t==5)
           OR (a=6939937510 AND f=2643383279 AND s='tab-t5' AND t!=123456) }

  } {
    do_test where8-4.$A.$B.1 {
      unset -nocomplain R
      set R [execsql $sql]
      if {![info exists results($B)]} {
        set results($B) $R
      }
      list
    } {}

    do_test where8-4.$A.$B.2 { lsort $R } [lsort $results($B)]
  }
  incr A
}
catch {unset results}
catch {unset A}
catch {unset B}

# At one point the following tests provoked an invalid write error (writing
# to memory that had already been freed). It was not possible to demonstrate
# that this bug could cause a query to return bad data.
# 
do_test where8-5.1 {
  db close
  sqlite3 db test.db
  sqlite3_db_config_lookaside db 0 0 0
  execsql {
    CREATE TABLE tA(
      a, b, c, d, e, f, g, h, 
      i, j, k, l, m, n, o, p
    );
  }
  execsql {
    SELECT * FROM tA WHERE
      a=1 AND b=2 AND c=3 AND d=4 AND e=5 AND f=6 AND g=7 AND h=8 AND
      i=1 AND j=2 AND k=3 AND l=4 AND m=5 AND n=6 AND o=7 AND
      (p = 1 OR p = 2 OR p = 3)
  }
} {}
do_test where8-5.2 {
  execsql {
    SELECT * FROM tA WHERE
      a=1 AND b=2 AND c=3 AND d=4 AND e=5 AND f=6 AND g=7 AND h=8 AND
      i=1 AND j=2 AND k=3 AND l=4 AND m=5 AND
      (p = 1 OR p = 2 OR p = 3) AND n=6 AND o=7
  }
} {}
do_test where8-5.3 {
  execsql {
    INSERT INTO tA VALUES(1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8); 
    CREATE UNIQUE INDEX tAI ON tA(p);
    CREATE TABLE tB(x);
    INSERT INTO tB VALUES('x');
  }
  execsql {
    SELECT a, x FROM tA LEFT JOIN tB ON (
      a=1 AND b=2 AND c=3 AND d=4 AND e=5 AND f=6 AND g=7 AND h=8 AND
      i=1 AND j=2 AND k=3 AND l=4 AND m=5 AND n=6 AND o=7 AND
      (p = 1 OR p = 2 OR p = 3)
    )
  }
} {1 {}}

# The OR optimization and WITHOUT ROWID
#
do_execsql_test where8-6.1 {
  CREATE TABLE t600(a PRIMARY KEY, b) WITHOUT rowid;
  CREATE INDEX t600b ON t600(b);
  INSERT INTO t600 VALUES('state','screen'),('exact','dolphin'),('green','mercury');
  SELECT a, b, '|' FROM t600 WHERE a=='state' OR b='mercury' ORDER BY +a;
} {green mercury | state screen |}

finish_test
