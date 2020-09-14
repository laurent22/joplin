# 2017 March 22
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
set testprefix fts3misc

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

#-------------------------------------------------------------------------
# A self-join.
#
do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts3(a, b);
  INSERT INTO t1 VALUES('one', 'i');
  INSERT INTO t1 VALUES('one', 'ii');
  INSERT INTO t1 VALUES('two', 'i');
  INSERT INTO t1 VALUES('two', 'ii');
}

do_execsql_test 1.1 {
  SELECT a.a, b.b FROM t1 a, t1 b WHERE a.t1 MATCH 'two' AND b.t1 MATCH 'i'
} {two i two i two i two i}

#-------------------------------------------------------------------------
# FTS tables with 128 or more columns.
#
proc v1 {v} {
  set vector [list a b c d e f g h]
  set res [list]
  for {set i 0} {$i<8} {incr i} {
    if {$v & (1 << $i)} { lappend res [lindex $vector $i] }
  }
  set res
}
proc v2 {v} {
  set vector [list d e f g h i j k]
  set res [list]
  for {set i 0} {$i<8} {incr i} {
    if {$v & (1 << $i)} { lappend res [lindex $vector $i] }
  }
  set res
}
db func v1 v1
db func v2 v2

do_test 2.0 {
  set cols [list]
  for {set i 0} {$i<200} {incr i} {
    lappend cols "c$i"
  }
  execsql "CREATE VIRTUAL TABLE t2 USING fts3([join $cols ,])"
  execsql {
    WITH data(i) AS (
      SELECT 1 UNION ALL SELECT i+1 FROM data WHERE i<200
    )
    INSERT INTO t2(c198, c199) SELECT v1(i), v2(i) FROM data;
  }
} {}
do_execsql_test 2.1 {
  SELECT rowid FROM t2 WHERE t2 MATCH '"a b c"'
} {
  7 15 23 31 39 47 55 63 71 79 87 95 103 111 
  119 127 135 143 151 159 167 175 183 191 199
}
do_execsql_test 2.2 {
  SELECT rowid FROM t2 WHERE t2 MATCH '"g h i"'
} {
  56 57 58 59 60 61 62 63 120 121 122 123 124 
  125 126 127 184 185 186 187 188 189 190 191
}
do_execsql_test 2.3 {
  SELECT rowid FROM t2 WHERE t2 MATCH '"i h"'
} {
}
do_execsql_test 2.4 {
  SELECT rowid FROM t2 WHERE t2 MATCH '"f e"'
} {
}
do_execsql_test 2.5 {
  SELECT rowid FROM t2 WHERE t2 MATCH '"e f"'
} {
  6 7 14 15 22 23 30 31 38 39 46 47 48 49 50 51 52 53 54 55 56 
  57 58 59 60 61 62 63 70 71 78 79 86 87 94 95 102 103 110 
  111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127
  134 135 142 143 150 151 158 159 166 167 174 175 176 177 178 179 180 
  181 182 183 184 185 186 187 188 189 190 191 198 199
}

#-------------------------------------------------------------------------
# Range constraints on the docid using non-integer values.
#
do_execsql_test 2.6 {
  SELECT rowid FROM t2 WHERE t2 MATCH 'e' AND rowid BETWEEN NULL AND 45;
} {}
do_execsql_test 2.7 {
  SELECT rowid FROM t2 WHERE t2 MATCH 'e' AND rowid BETWEEN 11.5 AND 48.2;
} {
  14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 
  29 30 31 34 35 38 39 42 43 46 47 48
}
do_execsql_test 2.8 {
  SELECT rowid FROM t2 WHERE t2 MATCH 'e' AND rowid BETWEEN '11.5' AND '48.2';
} {
  14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 
  29 30 31 34 35 38 39 42 43 46 47 48
}

#-------------------------------------------------------------------------
# Phrase query tests. 
#
do_execsql_test 3.1.1 {
  CREATE VIRTUAL TABLE t3 USING fts3;
  INSERT INTO t3 VALUES('a b c');
  INSERT INTO t3 VALUES('d e f');
  INSERT INTO t3 VALUES('a b d');
  INSERT INTO t3 VALUES('1 2 3 4 5 6 7 8 9 10 11');
}
do_execsql_test 3.1.2 {
  SELECT * FROM t3 WHERE t3 MATCH '"a b x y"' ORDER BY docid DESC
}
do_execsql_test 3.1.3 {
  SELECT * FROM t3 WHERE t3 MATCH '"a b c" OR "a b x y"' ORDER BY docid DESC
} {{a b c}}
do_execsql_test 3.1.4 {
  SELECT * FROM t3 WHERE t3 MATCH '"a* b* x* a*"'
}
do_execsql_test 3.1.5 {
  SELECT rowid FROM t3 WHERE t3 MATCH '"2 3 4 5 6 7 8 9"'
} {4}

#-------------------------------------------------------------------------
#
reset_db
ifcapable fts4_deferred {
  do_execsql_test 4.0 {
    PRAGMA page_size = 512;
    CREATE VIRTUAL TABLE t4 USING fts4;
    WITH s(i) AS ( SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<8000 )
    INSERT INTO t4 SELECT 'a b c a b c a b c' FROM s;
  }
  do_execsql_test 4.1 {
    SELECT count(*) FROM t4 WHERE t4 MATCH '"a b c" OR "c a b"'
  } {8000}
  do_execsql_test 4.2 {
    SELECT quote(value) from t4_stat where id=0
  } {X'C03EC0B204C0A608'}
  sqlite3_db_config db DEFENSIVE 0
  do_execsql_test 4.3 {
    UPDATE t4_stat SET value = X'C03EC0B204C0A60800' WHERE id=0;
  }
  do_catchsql_test 4.4 {
    SELECT count(*) FROM t4 WHERE t4 MATCH '"a b c" OR "c a b"'
  } {1 {database disk image is malformed}}
  do_execsql_test 4.5 {
    UPDATE t4_stat SET value = X'00C03EC0B204C0A608' WHERE id=0;
  }
  do_catchsql_test 4.6 {
    SELECT count(*) FROM t4 WHERE t4 MATCH '"a b c" OR "c a b"'
  } {1 {database disk image is malformed}}
}

#-------------------------------------------------------------------------
#
reset_db
do_execsql_test 5.0 {
  CREATE VIRTUAL TABLE t5 USING fts4;
  INSERT INTO t5 VALUES('a x x x x b x x x x c');
  INSERT INTO t5 VALUES('a x x x x b x x x x c');
  INSERT INTO t5 VALUES('a x x x x b x x x x c');
}
do_execsql_test 5.1 {
  SELECT rowid FROM t5 WHERE t5 MATCH 'a NEAR/4 b NEAR/4 c'
} {1 2 3}
do_execsql_test 5.2 {
  SELECT rowid FROM t5 WHERE t5 MATCH 'a NEAR/3 b NEAR/4 c'
} {}
do_execsql_test 5.3 {
  SELECT rowid FROM t5 WHERE t5 MATCH 'a NEAR/4 b NEAR/3 c'
} {}
do_execsql_test 5.4 {
  SELECT rowid FROM t5 WHERE t5 MATCH 'y NEAR/4 b NEAR/4 c'
} {}
do_execsql_test 5.5 {
  SELECT rowid FROM t5 WHERE t5 MATCH 'x OR a NEAR/3 b NEAR/3 c'
} {1 2 3}
do_execsql_test 5.5 {
  SELECT rowid FROM t5 WHERE t5 MATCH 'x OR y NEAR/3 b NEAR/3 c'
} {1 2 3}

#-------------------------------------------------------------------------
#
reset_db
do_execsql_test 6.0 {
  CREATE VIRTUAL TABLE t6 USING fts4;

  BEGIN;
  WITH s(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<50000)
    INSERT INTO t6 SELECT 'x x x x x x x x x x x' FROM s;

  INSERT INTO t6 VALUES('x x x x x x x x x x x A');
  INSERT INTO t6 VALUES('x x x x x x x x x x x B');
  INSERT INTO t6 VALUES('x x x x x x x x x x x A');
  INSERT INTO t6 VALUES('x x x x x x x x x x x B');

  WITH s(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<50000)
    INSERT INTO t6 SELECT 'x x x x x x x x x x x' FROM s;
  COMMIT;
}
do_execsql_test 6.1 {
  SELECT rowid FROM t6 WHERE t6 MATCH 'b OR "x a"'
} {50001 50002 50003 50004}

#-------------------------------------------------------------------------
#
reset_db
do_execsql_test 7.0 {
  CREATE VIRTUAL TABLE vt0 USING fts3(c0);
  INSERT INTO vt0 VALUES (x'00');
}
do_execsql_test 7.1 {
  INSERT INTO vt0(vt0) VALUES('integrity-check');
}

#-------------------------------------------------------------------------
# Ticket [8a6fa2bb].
#
reset_db
do_execsql_test 7.0.1 {
  CREATE VIRTUAL TABLE vt0 USING fts4(c0, order=DESC);
  INSERT INTO vt0(c0) VALUES (0), (0);
}
do_execsql_test 7.0.2 {
  INSERT INTO vt0(vt0) VALUES('integrity-check');
}
reset_db
do_execsql_test 7.1.1 {
  CREATE VIRTUAL TABLE vt0 USING fts4(c0, order=ASC);
  INSERT INTO vt0(c0) VALUES (0), (0);
}
do_execsql_test 7.1.2 {
  INSERT INTO vt0(vt0) VALUES('integrity-check');
}
do_execsql_test 7.2.1 {
  CREATE VIRTUAL TABLE ft USING fts4(c0, c1, order=DESC, prefix=1);
  INSERT INTO ft VALUES('a b c d', 'hello world');
  INSERT INTO ft VALUES('negative', 'positive');
  INSERT INTO ft VALUES('hello world', 'a b c d');
}
do_execsql_test 7.2.2 {
  INSERT INTO vt0(vt0) VALUES('integrity-check');
}

#-------------------------------------------------------------------------
# Ticket [745f1abc].
#
reset_db
do_execsql_test 8.1 {
  CREATE VIRTUAL TABLE vt0 USING fts4(c0, prefix=1);
}
do_execsql_test 8.2 {
  BEGIN;
    INSERT INTO vt0 VALUES (0);
    INSERT INTO vt0(vt0) VALUES('optimize');
  COMMIT;
}
do_execsql_test 8.3 {
  INSERT INTO vt0(vt0) VALUES('integrity-check');
}

#-------------------------------------------------------------------------
#
reset_db
do_execsql_test 9.0 {
  CREATE VIRTUAL TABLE t1 using fts4(mailcontent);
  insert into t1(rowid, mailcontent) values
      (-4764623217061966105, 'we are going to upgrade'),
      (8324454597464624651, 'we are going to upgrade');
}

do_execsql_test 9.1 {
  INSERT INTO t1(t1) VALUES('integrity-check');
}

do_execsql_test 9.2 {
  SELECT rowid FROM t1 WHERE t1 MATCH 'upgrade';
} {
  -4764623217061966105 8324454597464624651
}

#-------------------------------------------------------------------------
reset_db
do_execsql_test 10.0 {
  CREATE VIRTUAL TABLE f USING fts3(a,b);
  CREATE TABLE 'f_stat'(id INTEGER PRIMARY KEY, value BLOB);
  INSERT INTO f_stat VALUES (1,x'3b3b3b3b3b3b3b28ffffffffffffffffff1807f9073481f1d43bc93b3b3b3b3b3b3b3b3b3b18073b3b3b3b3b3b3b9b003b');
} {}

do_catchsql_test 10.1 {
  INSERT INTO f(f) VALUES ('merge=69,59');
} {1 {database disk image is malformed}}

#-------------------------------------------------------------------------
do_execsql_test 11.0 {
  CREATE VIRTUAL TABLE xyz USING fts3();
}
do_execsql_test 11.1 {
  SELECT * FROM xyz WHERE xyz MATCH 'a NEAR/4294836224 a';
}

finish_test
