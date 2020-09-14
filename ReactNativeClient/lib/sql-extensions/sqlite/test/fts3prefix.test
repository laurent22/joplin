# 2011 May 04
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
# focus of this script is testing the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts3prefix

ifcapable !fts3 {
  finish_test
  return
}

# This proc tests that the prefixes index appears to represent the same content
# as the terms index.
#
proc fts3_terms_and_prefixes {db tbl prefixlengths} {

  set iIndex 0
  foreach len $prefixlengths {
    incr iIndex
    $db eval {
      DROP TABLE IF EXISTS fts3check1;
      DROP TABLE IF EXISTS fts3check2;
    }
    $db eval "CREATE VIRTUAL TABLE fts3check1 USING fts4term($tbl, 0);"
    $db eval "CREATE VIRTUAL TABLE fts3check2 USING fts4term($tbl, $iIndex);"

    $db eval {
      DROP TABLE IF EXISTS temp.terms;
      DROP TABLE IF EXISTS temp.prefixes;
      CREATE TEMP TABLE terms AS SELECT * FROM fts3check1;
      CREATE TEMP TABLE prefixes AS SELECT * FROM fts3check2;
      CREATE INDEX temp.idx ON prefixes(term);
      DROP TABLE fts3check1;
      DROP TABLE fts3check2;
    }

    set nExpect 0
    $db eval { SELECT term, docid, col, pos FROM temp.terms } a {
      if {[string length $a(term)]<$len} continue
      incr nExpect
      set prefix [string range $a(term) 0 [expr $len-1]]
      set r [$db one { 
        SELECT count(*) FROM temp.prefixes WHERE 
        term = $prefix AND docid = $a(docid) AND col = $a(col) AND pos = $a(pos)
      }]
      if {$r != 1} {
        error "$t, $a(docid), $a(col), $a(pos)"
      }
    }

    set nCount [$db one {SELECT count(*) FROM temp.prefixes}]
    if {$nCount != $nExpect} {
      error "prefixes.count(*) is $nCount expected $nExpect"
    }
  
    execsql { DROP TABLE temp.prefixes }
    execsql { DROP TABLE temp.terms }

    set list [list]
    $db eval "
      SELECT sum( 1 << (16*(level%1024)) ) AS total, (level/1024) AS tree 
      FROM ${tbl}_segdir GROUP BY tree
    " {
      lappend list [list $total $tree]
    }

    if { [lsort -integer -index 0 $list] != [lsort -integer -index 1 $list] } {
      error "inconsistent tree structures: $list"
    }
  }

  return ""
}
proc fts3_tap_test {tn db tbl lens} {
  uplevel [list do_test $tn [list fts3_terms_and_prefixes $db $tbl $lens] ""]
}

#-------------------------------------------------------------------------
# Test cases 1.* are a sanity check. They test that the prefixes index is
# being constructed correctly for the simplest possible case.
#
do_execsql_test 1.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(prefix='1,3,6');

  CREATE VIRTUAL TABLE p1 USING fts4term(t1, 1);
  CREATE VIRTUAL TABLE p2 USING fts4term(t1, 2);
  CREATE VIRTUAL TABLE p3 USING fts4term(t1, 3);
  CREATE VIRTUAL TABLE terms USING fts4term(t1);
}
do_execsql_test 1.2 {
  INSERT INTO t1 VALUES('sqlite mysql firebird');
}
do_execsql_test 1.3.1 { SELECT term FROM p1 } {f m s}
do_execsql_test 1.3.2 { SELECT term FROM p2 } {fir mys sql}
do_execsql_test 1.3.3 { SELECT term FROM p3 } {firebi sqlite}
do_execsql_test 1.4 {
  SELECT term FROM terms;
} {firebird mysql sqlite}

fts3_tap_test 1.5 db t1 {1 3 6}

#-------------------------------------------------------------------------
# A slightly more complicated dataset. This test also verifies that DELETE
# operations do not corrupt the prefixes index.
#
do_execsql_test 2.1 {
  INSERT INTO t1 VALUES('FTS3 and FTS4 are an SQLite virtual table modules');
  INSERT INTO t1 VALUES('that allows users to perform full-text searches on');
  INSERT INTO t1 VALUES('a set of documents. The most common (and');
  INSERT INTO t1 VALUES('effective) way to describe full-text searches is');
  INSERT INTO t1 VALUES('"what Google, Yahoo and Altavista do with');
  INSERT INTO t1 VALUES('documents placed on the World Wide Web". Users');
  INSERT INTO t1 VALUES('input a term, or series of terms, perhaps');
  INSERT INTO t1 VALUES('connected by a binary operator or grouped together');
  INSERT INTO t1 VALUES('into a phrase, and the full-text query system');
  INSERT INTO t1 VALUES('finds the set of documents that best matches those');
  INSERT INTO t1 VALUES('terms considering the operators and groupings the');
  INSERT INTO t1 VALUES('user has specified. This article describes the');
  INSERT INTO t1 VALUES('deployment and usage of FTS3 and FTS4.');
  INSERT INTO t1 VALUES('FTS1 and FTS2 are obsolete full-text search');
  INSERT INTO t1 VALUES('modules for SQLite. There are known issues with');
  INSERT INTO t1 VALUES('these older modules and their use should be');
  INSERT INTO t1 VALUES('avoided. Portions of the original FTS3 code were');
  INSERT INTO t1 VALUES('contributed to the SQLite project by Scott Hess of');
  INSERT INTO t1 VALUES('Google. It is now developed and maintained as part');
  INSERT INTO t1 VALUES('of SQLite. ');
}
fts3_tap_test 2.2 db t1 {1 3 6}
do_execsql_test 2.3 { DELETE FROM t1 WHERE docid%2; }
fts3_tap_test 2.4 db t1 {1 3 6}

do_execsql_test 2.5 { INSERT INTO t1(t1) VALUES('optimize') }
fts3_tap_test 2.6 db t1 {1 3 6}

do_execsql_test 3.1 {
  CREATE VIRTUAL TABLE t2 USING fts4(prefix='1,2,3');
  INSERT INTO t2 VALUES('On 12 September the wind direction turned and');
  INSERT INTO t2 VALUES('William''s fleet sailed. A storm blew up and the');
  INSERT INTO t2 VALUES('fleet was forced to take shelter at');
  INSERT INTO t2 VALUES('Saint-Valery-sur-Somme and again wait for the wind');
  INSERT INTO t2 VALUES('to change. On 27 September the Norman fleet');
  INSERT INTO t2 VALUES('finally set sail, landing in England at Pevensey');
  INSERT INTO t2 VALUES('Bay (Sussex) on 28 September. William then moved');
  INSERT INTO t2 VALUES('to Hastings, a few miles to the east, where he');
  INSERT INTO t2 VALUES('built a prefabricated wooden castle for a base of');
  INSERT INTO t2 VALUES('operations. From there, he ravaged the hinterland');
  INSERT INTO t2 VALUES('and waited for Harold''s return from the north.');
  INSERT INTO t2 VALUES('On 12 September the wind direction turned and');
  INSERT INTO t2 VALUES('William''s fleet sailed. A storm blew up and the');
  INSERT INTO t2 VALUES('fleet was forced to take shelter at');
  INSERT INTO t2 VALUES('Saint-Valery-sur-Somme and again wait for the wind');
  INSERT INTO t2 VALUES('to change. On 27 September the Norman fleet');
  INSERT INTO t2 VALUES('finally set sail, landing in England at Pevensey');
  INSERT INTO t2 VALUES('Bay (Sussex) on 28 September. William then moved');
  INSERT INTO t2 VALUES('to Hastings, a few miles to the east, where he');
  INSERT INTO t2 VALUES('built a prefabricated wooden castle for a base of');
  INSERT INTO t2 VALUES('operations. From there, he ravaged the hinterland');
  INSERT INTO t2 VALUES('and waited for Harold''s return from the north.');
}

fts3_tap_test 3.2 db t2 {1 2 3}
do_execsql_test 3.3 { SELECT optimize(t2) FROM t2 LIMIT 1 } {{Index optimized}}
fts3_tap_test 3.4 db t2 {1 2 3}


#-------------------------------------------------------------------------
# Simple tests for reading the prefix-index.
#
do_execsql_test 4.1 {
  CREATE VIRTUAL TABLE t3 USING fts4(prefix="1,4");
  INSERT INTO t3 VALUES('one two three');
  INSERT INTO t3 VALUES('four five six');
  INSERT INTO t3 VALUES('seven eight nine');
}
do_execsql_test 4.2 {
  SELECT * FROM t3 WHERE t3 MATCH 'f*'
} {{four five six}}
do_execsql_test 4.3 {
  SELECT * FROM t3 WHERE t3 MATCH 'four*'
} {{four five six}}
do_execsql_test 4.4 {
  SELECT * FROM t3 WHERE t3 MATCH 's*'
} {{four five six} {seven eight nine}}
do_execsql_test 4.5 {
  SELECT * FROM t3 WHERE t3 MATCH 'sev*'
} {{seven eight nine}}
do_execsql_test 4.6 {
  SELECT * FROM t3 WHERE t3 MATCH 'one*'
} {{one two three}}

#-------------------------------------------------------------------------
# Syntax tests.
#
do_catchsql_test 5.1 {
  CREATE VIRTUAL TABLE t4 USING fts4(prefix="abc");
} {1 {error parsing prefix parameter: abc}}
do_catchsql_test 5.2 {
  CREATE VIRTUAL TABLE t4 USING fts4(prefix="");
} {0 {}}
do_catchsql_test 5.3 {
  CREATE VIRTUAL TABLE t5 USING fts4(prefix="-1");
} {1 {error parsing prefix parameter: -1}}

#-------------------------------------------------------------------------
# Prefix indexes of size 0 are ignored. Demonstrate this by showing that
# adding prefix=0 does not change the contents of the %_segdir table.
#
reset_db
do_execsql_test 6.1.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(prefix=0);
  CREATE VIRTUAL TABLE t2 USING fts4;
  INSERT INTO t1 VALUES('Twas Mulga Bill, from Eaglehawk, ');
  INSERT INTO t2 VALUES('Twas Mulga Bill, from Eaglehawk, ');
} {}
do_execsql_test 6.1.2 {
  SELECT md5sum(quote(root)) FROM t1_segdir;
} [db eval {SELECT md5sum(quote(root)) FROM t2_segdir}]

reset_db
do_execsql_test 6.2.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(prefix="1,0,2");
  CREATE VIRTUAL TABLE t2 USING fts4(prefix="1,2");
  INSERT INTO t1 VALUES('that caught the cycling craze;');
  INSERT INTO t2 VALUES('that caught the cycling craze;');
} {}
do_execsql_test 6.2.2 {
  SELECT md5sum(quote(root)) FROM t1_segdir;
} [db eval {SELECT md5sum(quote(root)) FROM t2_segdir}]

reset_db
do_execsql_test 6.3.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(prefix="1,3,2");
  CREATE VIRTUAL TABLE t2 USING fts4(prefix="1,2");
  INSERT INTO t1 VALUES('He turned away the good old horse');
  INSERT INTO t2 VALUES('He turned away the good old horse');
} {}
do_test 6.3.2 {
  set one [db eval {SELECT md5sum(quote(root)) FROM t1_segdir}]
  set two [db eval {SELECT md5sum(quote(root)) FROM t2_segdir}]
  expr {$one == $two}
} 0

reset_db
do_execsql_test 6.4.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(prefix="1,600,2");
  CREATE VIRTUAL TABLE t2 USING fts4(prefix="1,2");
  INSERT INTO t1 VALUES('that served him many days;');
  INSERT INTO t2 VALUES('that served him many days;');
} {}
do_execsql_test 6.4.2 {
  SELECT md5sum(quote(root)) FROM t1_segdir;
} [db eval {SELECT md5sum(quote(root)) FROM t2_segdir}]

reset_db
do_execsql_test 6.5.1 {
  CREATE VIRTUAL TABLE t1 USING fts4(prefix="2147483647,2147483648,2147483649");
  CREATE VIRTUAL TABLE t2 USING fts4(prefix=);
  INSERT INTO t1 VALUES('He dressed himself in cycling clothes');
  INSERT INTO t2 VALUES('He dressed himself in cycling clothes');
} {}
do_execsql_test 6.5.2 {
  SELECT md5sum(quote(root)) FROM t1_segdir;
} [db eval {SELECT md5sum(quote(root)) FROM t2_segdir}]


do_execsql_test 7.0 {
  CREATE VIRTUAL TABLE t6 USING fts4(x,order=DESC);
  INSERT INTO t6(docid, x) VALUES(-1,'a b');
  INSERT INTO t6(docid, x) VALUES(1, 'b');
}
do_execsql_test 7.1 {
  SELECT docid FROM t6 WHERE t6 MATCH '"a* b"';
} {-1}
do_execsql_test 7.2 {
  SELECT docid FROM t6 WHERE t6 MATCH 'a*';
} {-1}
do_execsql_test 7.3 {
  SELECT docid FROM t6 WHERE t6 MATCH 'a* b';
} {-1}



finish_test
