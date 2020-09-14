# 2010 November 02
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for the FTS3 module. The focus
# of this file is tables created with the "matchinfo=fts3" option.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 { finish_test ; return }

set testprefix fts3matchinfo
set sqlite_fts3_enable_parentheses 0

proc mit {blob} {
  set scan(littleEndian) i*
  set scan(bigEndian) I*
  binary scan $blob $scan($::tcl_platform(byteOrder)) r
  return $r
}
db func mit mit

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts4(matchinfo=fts3);
  SELECT name FROM sqlite_master WHERE type = 'table';
} {t1 t1_content t1_segments t1_segdir t1_stat}

do_execsql_test 1.1 {
  INSERT INTO t1(content) VALUES('I wandered lonely as a cloud');
  INSERT INTO t1(content) VALUES('That floats on high o''er vales and hills,');
  INSERT INTO t1(content) VALUES('When all at once I saw a crowd,');
  INSERT INTO t1(content) VALUES('A host, of golden daffodils,');
  SELECT mit(matchinfo(t1)) FROM t1 WHERE t1 MATCH 'I';
} {{1 1 1 2 2} {1 1 1 2 2}}

# Now create an FTS4 table that does not specify matchinfo=fts3.
#
do_execsql_test 1.2 {
  CREATE VIRTUAL TABLE t2 USING fts4;
  INSERT INTO t2 SELECT * FROM t1;
  SELECT mit(matchinfo(t2)) FROM t2 WHERE t2 MATCH 'I';
} {{1 1 1 2 2} {1 1 1 2 2}}

# Test some syntax-error handling.
#
do_catchsql_test 2.0 {
  CREATE VIRTUAL TABLE x1 USING fts4(matchinfo=fs3);
} {1 {unrecognized matchinfo: fs3}}
do_catchsql_test 2.1 {
  CREATE VIRTUAL TABLE x2 USING fts4(mtchinfo=fts3);
} {1 {unrecognized parameter: mtchinfo=fts3}}
do_catchsql_test 2.2 {
  CREATE VIRTUAL TABLE x2 USING fts4(matchinfo=fts5);
} {1 {unrecognized matchinfo: fts5}}

# Check that with fts3, the "=" character is permitted in column definitions.
#
do_execsql_test 3.1 {
  CREATE VIRTUAL TABLE t3 USING fts3(mtchinfo=fts3);
  INSERT INTO t3(mtchinfo) VALUES('Beside the lake, beneath the trees');
  SELECT mtchinfo FROM t3;
} {{Beside the lake, beneath the trees}}

do_execsql_test 3.2 {
  CREATE VIRTUAL TABLE xx USING FTS4;
}
do_execsql_test 3.3 {
  SELECT * FROM xx WHERE xx MATCH 'abc';
}
do_execsql_test 3.4 {
  SELECT * FROM xx WHERE xx MATCH 'a b c';
}


#--------------------------------------------------------------------------
# Proc [do_matchinfo_test] is used to test the FTSX matchinfo() function.
#
# The first argument - $tn - is a test identifier. This may be either a
# full identifier (i.e. "fts3matchinfo-1.1") or, if global var $testprefix
# is set, just the numeric component (i.e. "1.1").
#
# The second argument is the name of an FTSX table. The third is the 
# full text of a WHERE/MATCH expression to query the table for 
# (i.e. "t1 MATCH 'abc'"). The final argument - $results - should be a
# key-value list (serialized array) with matchinfo() format specifiers
# as keys, and the results of executing the statement:
#
#   SELECT matchinfo($tbl, '$key') FROM $tbl WHERE $expr
#
# For example:
#
#   CREATE VIRTUAL TABLE t1 USING fts4;
#   INSERT INTO t1 VALUES('abc');
#   INSERT INTO t1 VALUES('def');
#   INSERT INTO t1 VALUES('abc abc');
#
#   do_matchinfo_test 1.1 t1 "t1 MATCH 'abc'" {
#     n {3 3}
#     p {1 1}
#     c {1 1}
#     x {{1 3 2} {2 3 2}}
#   }
#
# If the $results list contains keys mapped to "-" instead of a matchinfo()
# result, then this command computes the expected results based on other
# mappings to test the matchinfo() function. For example, the command above
# could be changed to:
#
#   do_matchinfo_test 1.1 t1 "t1 MATCH 'abc'" {
#     n {3 3} p {1 1} c {1 1} x {{1 3 2} {2 3 2}}
#     pcx -
#   }
#
# And this command would compute the expected results for matchinfo(t1, 'pcx')
# based on the results of matchinfo(t1, 'p'), matchinfo(t1, 'c') and 
# matchinfo(t1, 'x') in order to test 'pcx'.
#
proc do_matchinfo_test {tn tbl expr results} {

  foreach {fmt res} $results {
    if {$res == "-"} continue
    set resarray($fmt) $res
  }

  set nRow 0
  foreach {fmt res} [array get resarray] {
    if {[llength $res]>$nRow} { set nRow [llength $res] }
  }

  # Construct expected results for any formats for which the caller 
  # supplied result is "-".
  #
  foreach {fmt res} $results {
    if {$res == "-"} {
      set res [list]
      for {set iRow 0} {$iRow<$nRow} {incr iRow} {
        set rowres [list]
        foreach c [split $fmt ""] {
          set rowres [concat $rowres [lindex $resarray($c) $iRow]]
        }
        lappend res $rowres
      }
      set resarray($fmt) $res
    }
  }

  # Test each matchinfo() request individually.
  #
  foreach {fmt res} [array get resarray] {
    set sql "SELECT mit(matchinfo($tbl, '$fmt')) FROM $tbl WHERE $expr"
    do_execsql_test $tn.$fmt $sql [normalize2 $res]
  }

  # Test them all executed together (multiple invocations of matchinfo()).
  #
  set exprlist [list]
  foreach {format res} [array get resarray] {
    lappend exprlist "mit(matchinfo($tbl, '$format'))"
  }
  set allres [list]
  for {set iRow 0} {$iRow<$nRow} {incr iRow} {
    foreach {format res} [array get resarray] {
      lappend allres [lindex $res $iRow]
    }
  }
  set sql "SELECT [join $exprlist ,] FROM $tbl WHERE $expr"
  do_execsql_test $tn.multi $sql [normalize2 $allres]
}
proc normalize2 {list_of_lists} {
  set res [list]
  foreach elem $list_of_lists {
    lappend res [list {*}$elem]
  }
  return $res
}


do_execsql_test 4.1.0 {
  CREATE VIRTUAL TABLE t4 USING fts4(x, y);
  INSERT INTO t4 VALUES('a b c d e', 'f g h i j');
  INSERT INTO t4 VALUES('f g h i j', 'a b c d e');
}

do_matchinfo_test 4.1.1 t4 {t4 MATCH 'a b c'} {
  p {3 3}
  c {2 2}
  x {
    {1 1 1   0 1 1   1 1 1   0 1 1   1 1 1   0 1 1}
    {0 1 1   1 1 1   0 1 1   1 1 1   0 1 1   1 1 1}
  }
  n {2 2}
  l {{5 5} {5 5}}
  a {{5 5} {5 5}}

  s {{3 0} {0 3}}

  xxxxxxxxxxxxxxxxxx - pcx - xpc - ccc - pppxpcpcx - laxnpc -
  xpxsscplax -
}

do_matchinfo_test 4.1.2 t4 {t4 MATCH '"g h i"'} {
  p {1 1}
  c {2 2}
  x {
    {0 1 1   1 1 1}
    {1 1 1   0 1 1}
  }
  n {2 2}
  l {{5 5} {5 5}}
  a {{5 5} {5 5}}

  s {{0 1} {1 0}}

  xxxxxxxxxxxxxxxxxx - pcx - xpc - ccc - pppxpcpcx - laxnpc -
  sxsxs -
}

do_matchinfo_test 4.1.3 t4 {t4 MATCH 'a b'}     { s {{2 0} {0 2}} }
do_matchinfo_test 4.1.4 t4 {t4 MATCH '"a b" c'} { s {{2 0} {0 2}} }
do_matchinfo_test 4.1.5 t4 {t4 MATCH 'a "b c"'} { s {{2 0} {0 2}} }
do_matchinfo_test 4.1.6 t4 {t4 MATCH 'd d'}     { s {{1 0} {0 1}} }
do_matchinfo_test 4.1.7 t4 {t4 MATCH 'f OR abcd'} {
  x { 
    {0 1 1  1 1 1  0 0 0  0 0 0} 
    {1 1 1  0 1 1  0 0 0  0 0 0}
  }
}
do_matchinfo_test 4.1.8 t4 {t4 MATCH 'f -abcd'} {
  x { 
    {0 1 1  1 1 1}
    {1 1 1  0 1 1}
  }
}

do_execsql_test 4.2.0 {
  CREATE VIRTUAL TABLE t5 USING fts4;
  INSERT INTO t5 VALUES('a a a a a');
  INSERT INTO t5 VALUES('a b a b a');
  INSERT INTO t5 VALUES('c b c b c');
  INSERT INTO t5 VALUES('x x x x x');
}
do_matchinfo_test 4.2.1 t5 {t5 MATCH 'a a'}         { 
  x {{5 8 2   5 8 2} {3 8 2   3 8 2}}
  s {2 1} 
}
do_matchinfo_test 4.2.2 t5 {t5 MATCH 'a b'}         { s {2} }
do_matchinfo_test 4.2.3 t5 {t5 MATCH 'a b a'}       { s {3} }
do_matchinfo_test 4.2.4 t5 {t5 MATCH 'a a a'}       { s {3 1} }
do_matchinfo_test 4.2.5 t5 {t5 MATCH '"a b" "a b"'} { s {2} }
do_matchinfo_test 4.2.6 t5 {t5 MATCH 'a OR b'}      { s {1 2 1} }

do_execsql_test 4.3.0 "INSERT INTO t5 VALUES('x y [string repeat {b } 50000]')";

# It used to be that the second 'a' token would be deferred. That doesn't
# work any longer.
if 0 {
  do_matchinfo_test 4.3.1 t5 {t5 MATCH 'a a'} { 
    x {{5 8 2   5 5 5} {3 8 2   3 5 5}}
    s {2 1} 
  }
}

do_matchinfo_test 4.3.2 t5 {t5 MATCH 'a b'}         { s {2} }
do_matchinfo_test 4.3.3 t5 {t5 MATCH 'a b a'}       { s {3} }
do_matchinfo_test 4.3.4 t5 {t5 MATCH 'a a a'}       { s {3 1} }
do_matchinfo_test 4.3.5 t5 {t5 MATCH '"a b" "a b"'} { s {2} }
do_matchinfo_test 4.3.6 t5 {t5 MATCH 'a OR b'}      { s {1 2 1 1} }

do_execsql_test 4.4.0.1 { INSERT INTO t5(t5) VALUES('optimize') }

ifcapable fts4_deferred {
  sqlite3_db_config db DEFENSIVE 0
  do_execsql_test 4.4.0.2 {
    UPDATE t5_segments 
    SET block = zeroblob(length(block)) 
    WHERE length(block)>10000;
  }
}

do_matchinfo_test 4.4.2 t5 {t5 MATCH 'a b'}         { s {2} }
do_matchinfo_test 4.4.1 t5 {t5 MATCH 'a a'}         { s {2 1} }
do_matchinfo_test 4.4.2 t5 {t5 MATCH 'a b'}         { s {2} }
do_matchinfo_test 4.4.3 t5 {t5 MATCH 'a b a'}       { s {3} }
do_matchinfo_test 4.4.4 t5 {t5 MATCH 'a a a'}       { s {3 1} }
do_matchinfo_test 4.4.5 t5 {t5 MATCH '"a b" "a b"'} { s {2} }

do_execsql_test 4.5.0 {
  CREATE VIRTUAL TABLE t6 USING fts4(a, b, c);
  INSERT INTO t6 VALUES('a', 'b', 'c');
}
do_matchinfo_test 4.5.1 t6 {t6 MATCH 'a b c'}       { s {{1 1 1}} }


#-------------------------------------------------------------------------
# Check the following restrictions:
#
#   + Matchinfo flags 'a', 'l' and 'n' can only be used with fts4, not fts3.
#   + Matchinfo flag 'l' cannot be used with matchinfo=fts3.
#
do_execsql_test 5.1 {
  CREATE VIRTUAL TABLE t7 USING fts3(a, b);
  INSERT INTO t7 VALUES('u v w', 'x y z');

  CREATE VIRTUAL TABLE t8 USING fts4(a, b, matchinfo=fts3);
  INSERT INTO t8 VALUES('u v w', 'x y z');
}

do_catchsql_test 5.2.1 { 
  SELECT matchinfo(t7, 'a') FROM t7 WHERE t7 MATCH 'x y'
} {1 {unrecognized matchinfo request: a}}
do_catchsql_test 5.2.2 { 
  SELECT matchinfo(t7, 'l') FROM t7 WHERE t7 MATCH 'x y'
} {1 {unrecognized matchinfo request: l}}
do_catchsql_test 5.2.3 { 
  SELECT matchinfo(t7, 'n') FROM t7 WHERE t7 MATCH 'x y'
} {1 {unrecognized matchinfo request: n}}

do_catchsql_test 5.3.1 { 
  SELECT matchinfo(t8, 'l') FROM t8 WHERE t8 MATCH 'x y'
} {1 {unrecognized matchinfo request: l}}

#-------------------------------------------------------------------------
# Test that the offsets() function handles corruption in the %_content
# table correctly.
#
do_execsql_test 6.1 {
  CREATE VIRTUAL TABLE t9 USING fts4;
  INSERT INTO t9 VALUES(
    'this record is used to try to dectect corruption'
  );
  SELECT offsets(t9) FROM t9 WHERE t9 MATCH 'to';
} {{0 0 20 2 0 0 27 2}}

sqlite3_db_config db DEFENSIVE 0
do_catchsql_test 6.2 {
  UPDATE t9_content SET c0content = 'this record is used to'; 
  SELECT offsets(t9) FROM t9 WHERE t9 MATCH 'to';
} {1 {database disk image is malformed}}

#-------------------------------------------------------------------------
# Test the outcome of matchinfo() when used within a query that does not
# use the full-text index (i.e. lookup by rowid or full-table scan).
#
do_execsql_test 7.1 {
  CREATE VIRTUAL TABLE t10 USING fts4;
  INSERT INTO t10 VALUES('first record');
  INSERT INTO t10 VALUES('second record');
}
do_execsql_test 7.2 {
  SELECT typeof(matchinfo(t10)), length(matchinfo(t10)) FROM t10;
} {blob 0 blob 0}
do_execsql_test 7.3 {
  SELECT typeof(matchinfo(t10)), length(matchinfo(t10)) FROM t10 WHERE docid=1;
} {blob 0}
do_execsql_test 7.4 {
  SELECT typeof(matchinfo(t10)), length(matchinfo(t10)) 
  FROM t10 WHERE t10 MATCH 'record'
} {blob 20 blob 20}

#-------------------------------------------------------------------------
# Test a special case - matchinfo('nxa') with many zero length documents. 
# Special because "x" internally uses a statement used by both "n" and "a". 
# This was causing a problem at one point in the obscure case where the
# total number of bytes of data stored in an fts3 table was greater than
# the number of rows. i.e. when the following query returns true:
#
#   SELECT sum(length(content)) < count(*) FROM fts4table;
#
do_execsql_test 8.1 {
  CREATE VIRTUAL TABLE t11 USING fts4;
  INSERT INTO t11(t11) VALUES('nodesize=24');
  INSERT INTO t11 VALUES('quitealongstringoftext');
  INSERT INTO t11 VALUES('anotherquitealongstringoftext');
  INSERT INTO t11 VALUES('athirdlongstringoftext');
  INSERT INTO t11 VALUES('andonemoreforgoodluck');
}
do_test 8.2 {
  for {set i 0} {$i < 200} {incr i} {
    execsql { INSERT INTO t11 VALUES('') }
  }
  execsql { INSERT INTO t11(t11) VALUES('optimize') }
} {}
do_execsql_test 8.3 {
  SELECT mit(matchinfo(t11, 'nxa')) FROM t11 WHERE t11 MATCH 'a*'
} {{204 1 3 3 0} {204 1 3 3 0} {204 1 3 3 0}}

# Corruption related tests.
sqlite3_db_config db DEFENSIVE 0
do_execsql_test  8.4.1.1 { UPDATE t11_stat SET value = X'0000'; }
do_catchsql_test 8.5.1.2 {
  SELECT mit(matchinfo(t11, 'nxa')) FROM t11 WHERE t11 MATCH 'a*'
} {1 {database disk image is malformed}}

do_execsql_test  8.4.2.1 { UPDATE t11_stat SET value = X'00'; }
do_catchsql_test 8.5.2.2 {
  SELECT mit(matchinfo(t11, 'nxa')) FROM t11 WHERE t11 MATCH 'a*'
} {1 {database disk image is malformed}}

do_execsql_test  8.4.3.1 { UPDATE t11_stat SET value = NULL; }
do_catchsql_test 8.5.3.2 {
  SELECT mit(matchinfo(t11, 'nxa')) FROM t11 WHERE t11 MATCH 'a*'
} {1 {database disk image is malformed}}

#-------------------------------------------------------------------------
do_execsql_test 8.1 {
  CREATE VIRTUAL TABLE t12 USING fts4;
  INSERT INTO t12 VALUES('a b c d');
  SELECT mit(matchinfo(t12, 'x')) FROM t12 WHERE t12 MATCH 'a NEAR/1 d OR a';
} {{0 0 0 0 0 0 1 1 1}}
do_execsql_test 8.2 {
  INSERT INTO t12 VALUES('a d c d');
  SELECT mit(matchinfo(t12, 'x')) FROM t12 WHERE t12 MATCH 'a NEAR/1 d OR a';
} {
  {0 1 1 0 1 1 1 2 2} {1 1 1 1 1 1 1 2 2}
}
do_execsql_test 8.3 {
  INSERT INTO t12 VALUES('a d d a');
  SELECT mit(matchinfo(t12, 'x')) FROM t12 WHERE t12 MATCH 'a NEAR/1 d OR a';
} {
  {0 3 2 0 3 2 1 4 3} {1 3 2 1 3 2 1 4 3} {2 3 2 2 3 2 2 4 3}
}

do_execsql_test 9.1 {
  CREATE VIRTUAL TABLE ft2 USING fts4;
  INSERT INTO ft2 VALUES('a b c d e');
  INSERT INTO ft2 VALUES('f a b c d');
  SELECT snippet(ft2, '[', ']', '', -1, 1) FROM ft2 WHERE ft2 MATCH 'c';
} {{[c]} {[c]}}

#---------------------------------------------------------------------------
# Test for a memory leak
#
do_execsql_test 10.1 {
  DROP TABLE t10;
  CREATE VIRTUAL TABLE t10 USING fts4(idx, value);
  INSERT INTO t10 values (1, 'one'),(2, 'two'),(3, 'three');
  SELECT docId, t10.*
    FROM t10
    JOIN (SELECT 1 AS idx UNION SELECT 2 UNION SELECT 3) AS x
   WHERE t10 MATCH x.idx
     AND matchinfo(t10) not null
   GROUP BY docId
   ORDER BY 1;
} {1 1 one 2 2 two 3 3 three}
  
#---------------------------------------------------------------------------
# Test the 'y' matchinfo flag
#
set sqlite_fts3_enable_parentheses 1
reset_db
do_execsql_test 11.0 {
  CREATE VIRTUAL TABLE tt USING fts3(x, y);
  INSERT INTO tt VALUES('c d a c d d', 'e a g b d a');   -- 1
  INSERT INTO tt VALUES('c c g a e b', 'c g d g e c');   -- 2
  INSERT INTO tt VALUES('b e f d e g', 'b a c b c g');   -- 3
  INSERT INTO tt VALUES('a c f f g d', 'd b f d e g');   -- 4
  INSERT INTO tt VALUES('g a c f c f', 'd g g b c c');   -- 5
  INSERT INTO tt VALUES('g a c e b b', 'd b f b g g');   -- 6
  INSERT INTO tt VALUES('f d a a f c', 'e e a d c f');   -- 7
  INSERT INTO tt VALUES('a c b b g f', 'a b a e d f');   -- 8
  INSERT INTO tt VALUES('b a f e c c', 'f d b b a b');   -- 9
  INSERT INTO tt VALUES('f d c e a c', 'f a f a a f');   -- 10
}

db func mit mit
foreach {tn expr res} {
  1 "a" {
      1 {1 2}   2 {1 0}   3 {0 1}   4 {1 0}   5 {1 0}
      6 {1 0}   7 {2 1}   8 {1 2}   9 {1 1}  10 {1 3}
  }

  2 "b" {
      1 {0 1}   2 {1 0}   3 {1 2}   4 {0 1}   5 {0 1}
      6 {2 2}             8 {2 1}   9 {1 3}            
  }

  3 "y:a" {
      1 {0 2}             3 {0 1}                    
                7 {0 1}   8 {0 2}   9 {0 1}  10 {0 3}
  }

  4 "x:a" {
      1 {1 0}   2 {1 0}             4 {1 0}   5 {1 0}
      6 {1 0}   7 {2 0}   8 {1 0}   9 {1 0}  10 {1 0}
  }

  5 "a OR b" {
      1 {1 2 0 1}   2 {1 0 1 0}   3 {0 1 1 2}   4 {1 0 0 1}   5 {1 0 0 1}
      6 {1 0 2 2}   7 {2 1 0 0}   8 {1 2 2 1}   9 {1 1 1 3}  10 {1 3 0 0}
  }

  6 "a AND b" {
      1 {1 2 0 1}   2 {1 0 1 0}   3 {0 1 1 2}   4 {1 0 0 1}   5 {1 0 0 1}
      6 {1 0 2 2}                 8 {1 2 2 1}   9 {1 1 1 3}              
  }

  7 "a OR (a AND b)" {
      1 {1 2 1 2 0 1}   2 {1 0 1 0 1 0}   3 {0 1 0 1 1 2}   4 {1 0 1 0 0 1}   
      5 {1 0 1 0 0 1}   6 {1 0 1 0 2 2}   7 {2 1 0 0 0 0}   8 {1 2 1 2 2 1}   
      9 {1 1 1 1 1 3}  10 {1 3 0 0 0 0}
  }

} {
  do_execsql_test 11.1.$tn.1  {
    SELECT rowid, mit(matchinfo(tt, 'y')) FROM tt WHERE tt MATCH $expr
  } $res

  set r2 [list]
  foreach {rowid L} $res {
    lappend r2 $rowid
    set M [list]
    foreach {a b} $L {
      lappend M [expr ($a ? 1 : 0) + ($b ? 2 : 0)]
    }
    lappend r2 $M
  }

  do_execsql_test 11.1.$tn.2  {
    SELECT rowid, mit(matchinfo(tt, 'b')) FROM tt WHERE tt MATCH $expr
  } $r2

  do_execsql_test 11.1.$tn.2  {
    SELECT rowid, mit(matchinfo(tt, 'b')) FROM tt WHERE tt MATCH $expr
  } $r2
}
set sqlite_fts3_enable_parentheses 0

#---------------------------------------------------------------------------
# Test the 'b' matchinfo flag
#
set sqlite_fts3_enable_parentheses 1
reset_db
db func mit mit

do_test 12.0 {
  set cols [list]
  for {set i 0} {$i < 50} {incr i} { lappend cols "c$i" }
  execsql "CREATE VIRTUAL TABLE tt USING fts3([join $cols ,])"
} {}

do_execsql_test 12.1 {
  INSERT INTO tt (rowid, c4, c45) VALUES(1, 'abc', 'abc');
  SELECT mit(matchinfo(tt, 'b')) FROM tt WHERE tt MATCH 'abc';
} [list [list [expr 1<<4] [expr 1<<(45-32)]]]

set sqlite_fts3_enable_parentheses 0
finish_test
