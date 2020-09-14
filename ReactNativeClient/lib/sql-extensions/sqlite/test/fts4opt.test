# 2016 March 8
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set ::testprefix fts4opt

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Create the fts_kjv_genesis procedure which fills and FTS3/4 table 
# with the complete text of the Book of Genesis.
#
source $testdir/genesis.tcl

do_execsql_test 1.0 { CREATE TABLE t1(docid, words) }
fts_kjv_genesis

#-------------------------------------------------------------------------
# Argument $db is an open database handle. $tbl is the name of an FTS3/4
# table with the database. This command rearranges the contents of the
# %_segdir table so that all segments within each index are on the same
# level. This means that the 'merge' command can then be used for an
# incremental optimize routine.
#
proc prepare_for_optimize {db tbl} {
  sqlite3_db_config $db DEFENSIVE 0
  $db eval [string map [list % $tbl] {
    BEGIN;
      CREATE TEMP TABLE tmp_segdir(
        level, idx, start_block, leaves_end_block, end_block, root
      );

      INSERT INTO temp.tmp_segdir 
        SELECT 
        1024*(o.level / 1024) + 32,                                -- level
        sum(o.level<i.level OR (o.level=i.level AND o.idx>i.idx)), -- idx
        o.start_block, o.leaves_end_block, o.end_block, o.root     -- other
        FROM %_segdir o, %_segdir i 
        WHERE (o.level / 1024) = (i.level / 1024)
        GROUP BY o.level, o.idx;
  
      DELETE FROM %_segdir;
      INSERT INTO %_segdir SELECT * FROM temp.tmp_segdir;
      DROP TABLE temp.tmp_segdir;
  
    COMMIT;
  }]
}

do_test 1.1 {
  execsql { CREATE VIRTUAL TABLE t2 USING fts4(words, prefix="1,2,3") }
  foreach {docid words} [db eval { SELECT * FROM t1 }] {
    execsql { INSERT INTO t2(docid, words) VALUES($docid, $words) }
  }
} {}

do_execsql_test 1.2 {
  SELECT level, count(*) FROM t2_segdir GROUP BY level
} {
  0    13    1 15    2 5 
  1024 13 1025 15 1026 5 
  2048 13 2049 15 2050 5 
  3072 13 3073 15 3074 5
}

do_execsql_test 1.3 { INSERT INTO t2(t2) VALUES('integrity-check') }
prepare_for_optimize db t2
do_execsql_test 1.4 { INSERT INTO t2(t2) VALUES('integrity-check') }

do_execsql_test 1.5 {
  SELECT level, count(*) FROM t2_segdir GROUP BY level
} {
  32   33 
  1056 33 
  2080 33 
  3104 33
}

do_test 1.6 {
  while 1 {
    set tc1 [db total_changes]
    execsql { INSERT INTO t2(t2) VALUES('merge=5,2') }
    set tc2 [db total_changes]
    if {($tc2 - $tc1) < 2} break
  }
  execsql { SELECT level, count(*) FROM t2_segdir GROUP BY level }
} {33 1 1057 1 2081 1 3105 1}
do_execsql_test 1.7 { INSERT INTO t2(t2) VALUES('integrity-check') }

do_execsql_test 1.8 {
  INSERT INTO t2(words) SELECT words FROM t1;
  SELECT level, count(*) FROM t2_segdir GROUP BY level;
} {0 2 1024 2 2048 2 3072 2}

#-------------------------------------------------------------------------

do_execsql_test 2.0 {
  DELETE FROM t2;
}
do_test 2.1 {
  foreach {docid words} [db eval { SELECT * FROM t1 }] {
    execsql { INSERT INTO t2(docid, words) VALUES($docid, $words) }
  }

  set i 0
  foreach {docid words} [db eval { SELECT * FROM t1 }] {
    if {[incr i] % 2} { execsql { DELETE FROM t2 WHERE docid = $docid } }
  }

  set i 0
  foreach {docid words} [db eval { SELECT * FROM t1 }] {
    if {[incr i] % 3} {
      execsql { INSERT OR REPLACE INTO t2(docid, words) VALUES($docid, $words) }
    }
  }
} {}

do_execsql_test 2.2 {
  SELECT level, count(*) FROM t2_segdir GROUP BY level
} {
  0    10    1 15    2 12 
  1024 10 1025 15 1026 12 
  2048 10 2049 15 2050 12 
  3072 10 3073 15 3074 12
}

do_execsql_test 2.3 { INSERT INTO t2(t2) VALUES('integrity-check') }
prepare_for_optimize db t2
do_execsql_test 2.4 { INSERT INTO t2(t2) VALUES('integrity-check') }

do_execsql_test 2.5 {
  SELECT level, count(*) FROM t2_segdir GROUP BY level
} {
    32 37 
  1056 37 
  2080 37 
  3104 37
}

do_test 2.6 {
  while 1 {
    set tc1 [db total_changes]
    execsql { INSERT INTO t2(t2) VALUES('merge=5,2') }
    set tc2 [db total_changes]
    if {($tc2 - $tc1) < 2} break
  }
  execsql { SELECT level, count(*) FROM t2_segdir GROUP BY level }
} {33 1 1057 1 2081 1 3105 1}
do_execsql_test 2.7 { INSERT INTO t2(t2) VALUES('integrity-check') }

do_execsql_test 2.8 {
  INSERT INTO t2(words) SELECT words FROM t1;
  SELECT level, count(*) FROM t2_segdir GROUP BY level;
} {0 2 1024 2 2048 2 3072 2}

#-------------------------------------------------------------------------
# Check that 'optimize' works when there is data in the in-memory hash
# table, but no segments at all on disk.
#
do_execsql_test 3.1 {
  CREATE VIRTUAL TABLE fts USING fts4 (t);
  INSERT INTO fts (fts) VALUES ('optimize');
}
do_execsql_test 3.2 {
  INSERT INTO fts(fts) VALUES('integrity-check');
  SELECT count(*) FROM fts_segdir;
} {0}
do_execsql_test 3.3 {
  BEGIN;
  INSERT INTO fts (rowid, t) VALUES (2, 'test');
  INSERT INTO fts (fts) VALUES ('optimize');
  COMMIT;
  SELECT level, idx FROM fts_segdir;
} {0 0}
do_execsql_test 3.4 {
  INSERT INTO fts(fts) VALUES('integrity-check');
  SELECT rowid FROM fts WHERE fts MATCH 'test';
} {2}
do_execsql_test 3.5 {
  INSERT INTO fts (fts) VALUES ('optimize');
  INSERT INTO fts(fts) VALUES('integrity-check');
}
do_test 3.6 {
  set c1 [db total_changes]
  execsql { INSERT INTO fts (fts) VALUES ('optimize') }
  expr {[db total_changes] - $c1}
} {1}
do_test 3.7 {
  execsql { INSERT INTO fts (rowid, t) VALUES (3, 'xyz') }
  set c1 [db total_changes]
  execsql { INSERT INTO fts (fts) VALUES ('optimize') }
  expr {([db total_changes] - $c1) > 1}
} {1}
do_test 3.8 {
  set c1 [db total_changes]
  execsql { INSERT INTO fts (fts) VALUES ('optimize') }
  expr {[db total_changes] - $c1}
} {1}

finish_test
