# 2008 June 26
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The focus
# of this script is testing the FTS3 module's optimize() function.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl

# If SQLITE_ENABLE_FTS3 is not defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

#*************************************************************************
# Utility function to check for the expected terms in the segment
# level/index.  _all version does same but for entire index.
proc check_terms {test level index terms} {
  set where "level = $level AND idx = $index"
  do_test $test.terms [list fts3_terms t1 $where] $terms
}
proc check_terms_all {test terms} {
  do_test $test.terms [list fts3_terms t1 1] $terms
}

# Utility function to check for the expected doclist for the term in
# segment level/index.  _all version does same for entire index.
proc check_doclist {test level index term doclist} {
  set where "level = $level AND idx = $index"
  do_test $test.doclist [list fts3_doclist t1 $term $where] $doclist
}
proc check_doclist_all {test term doclist} {
  do_test $test.doclist [list fts3_doclist t1 $term 1] $doclist
}

#*************************************************************************
# Test results when all rows are deleted and one is added back.
# Previously older segments would continue to exist, but now the index
# should be dropped when the table is empty.  The results should look
# exactly like we never added the earlier rows in the first place.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
  DELETE FROM t1 WHERE 1=1; -- Delete each row rather than dropping table.
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
}

# Should be a single initial segment.
do_test fts3d-1.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0}
do_test fts3d-1.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} {{0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4}}

check_terms_all fts3d-1.1 {a is test this}
check_doclist_all fts3d-1.1.1 a {[1 0[2]]}
check_doclist_all fts3d-1.1.2 is {[1 0[1]]}
check_doclist_all fts3d-1.1.3 test {[1 0[3]]}
check_doclist_all fts3d-1.1.4 this {[1 0[0]]}

check_terms   fts3d-1.2   0 0 {a is test this}
check_doclist fts3d-1.2.1 0 0 a {[1 0[2]]}
check_doclist fts3d-1.2.2 0 0 is {[1 0[1]]}
check_doclist fts3d-1.2.3 0 0 test {[1 0[3]]}
check_doclist fts3d-1.2.4 0 0 this {[1 0[0]]}

#*************************************************************************
# Test results when everything is optimized manually.
# NOTE(shess): This is a copy of fts3c-1.3.  I've pulled a copy here
# because fts3d-2 and fts3d-3 should have identical results.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
  DELETE FROM t1 WHERE docid IN (1,3);
  DROP TABLE IF EXISTS t1old;
  ALTER TABLE t1 RENAME TO t1old;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) SELECT docid, c FROM t1old;
  DROP TABLE t1old;
}

# Should be a single optimal segment with the same logical results.
do_test fts3d-2.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0}
do_test fts3d-2.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} {{0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4}}

check_terms_all fts3d-2.1 {a test that was}
check_doclist_all fts3d-2.1.1 a {[2 0[2]]}
check_doclist_all fts3d-2.1.2 test {[2 0[3]]}
check_doclist_all fts3d-2.1.3 that {[2 0[0]]}
check_doclist_all fts3d-2.1.4 was {[2 0[1]]}

check_terms fts3d-2.2 0 0 {a test that was}
check_doclist fts3d-2.2.1 0 0 a {[2 0[2]]}
check_doclist fts3d-2.2.2 0 0 test {[2 0[3]]}
check_doclist fts3d-2.2.3 0 0 that {[2 0[0]]}
check_doclist fts3d-2.2.4 0 0 was {[2 0[1]]}

#*************************************************************************
# Test results when everything is optimized via optimize().
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
  DELETE FROM t1 WHERE docid IN (1,3);
  SELECT OPTIMIZE(t1) FROM t1 LIMIT 1;
}

# Should be a single optimal segment with the same logical results.
do_test fts3d-3.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0}
do_test fts3d-3.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} {{0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4}}

check_terms_all fts3d-3.1 {a test that was}
check_doclist_all fts3d-3.1.1 a {[2 0[2]]}
check_doclist_all fts3d-3.1.2 test {[2 0[3]]}
check_doclist_all fts3d-3.1.3 that {[2 0[0]]}
check_doclist_all fts3d-3.1.4 was {[2 0[1]]}

check_terms fts3d-3.2 0 0 {a test that was}
check_doclist fts3d-3.2.1 0 0 a {[2 0[2]]}
check_doclist fts3d-3.2.2 0 0 test {[2 0[3]]}
check_doclist fts3d-3.2.3 0 0 that {[2 0[0]]}
check_doclist fts3d-3.2.4 0 0 was {[2 0[1]]}

#*************************************************************************
# Test optimize() against a table involving segment merges.
# NOTE(shess): Since there's no transaction, each of the INSERT/UPDATE
# statements generates a segment.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);

  INSERT INTO t1 (rowid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (rowid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (rowid, c) VALUES (3, 'This is a test');

  UPDATE t1 SET c = 'This is a test one' WHERE rowid = 1;
  UPDATE t1 SET c = 'That was a test one' WHERE rowid = 2;
  UPDATE t1 SET c = 'This is a test one' WHERE rowid = 3;

  UPDATE t1 SET c = 'This is a test two' WHERE rowid = 1;
  UPDATE t1 SET c = 'That was a test two' WHERE rowid = 2;
  UPDATE t1 SET c = 'This is a test two' WHERE rowid = 3;

  UPDATE t1 SET c = 'This is a test three' WHERE rowid = 1;
  UPDATE t1 SET c = 'That was a test three' WHERE rowid = 2;
  UPDATE t1 SET c = 'This is a test three' WHERE rowid = 3;

  UPDATE t1 SET c = 'This is a test four' WHERE rowid = 1;
  UPDATE t1 SET c = 'That was a test four' WHERE rowid = 2;
  UPDATE t1 SET c = 'This is a test four' WHERE rowid = 3;

  UPDATE t1 SET c = 'This is a test' WHERE rowid = 1;
  UPDATE t1 SET c = 'That was a test' WHERE rowid = 2;
  UPDATE t1 SET c = 'This is a test' WHERE rowid = 3;
}

# 2 segments in level 0, 1 in level 1 (18 segments created, 16
# merged).
do_test fts3d-4.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0 0 1 1 0}

do_test fts3d-4.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} [list {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4} \
        {0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4} \
        {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4}]

db eval {SELECT c FROM t1 }
check_terms_all fts3d-4.1      {a four is test that this was}
check_doclist_all fts3d-4.1.1  a {[1 0[2]] [2 0[2]] [3 0[2]]}
check_doclist_all fts3d-4.1.2  four {}
check_doclist_all fts3d-4.1.3  is {[1 0[1]] [3 0[1]]}
#check_doclist_all fts3d-4.1.4  one {}
check_doclist_all fts3d-4.1.5  test {[1 0[3]] [2 0[3]] [3 0[3]]}
check_doclist_all fts3d-4.1.6  that {[2 0[0]]}
check_doclist_all fts3d-4.1.7  this {[1 0[0]] [3 0[0]]}
#check_doclist_all fts3d-4.1.8  three {}
#check_doclist_all fts3d-4.1.9  two {}
check_doclist_all fts3d-4.1.10 was {[2 0[1]]}

check_terms fts3d-4.2     0 0 {a four test that was}
check_doclist fts3d-4.2.1 0 0 a {[2 0[2]]}
check_doclist fts3d-4.2.2 0 0 four {[2]}
check_doclist fts3d-4.2.3 0 0 test {[2 0[3]]}
check_doclist fts3d-4.2.4 0 0 that {[2 0[0]]}
check_doclist fts3d-4.2.5 0 0 was {[2 0[1]]}

check_terms fts3d-4.3     0 1 {a four is test this}
check_doclist fts3d-4.3.1 0 1 a {[3 0[2]]}
check_doclist fts3d-4.3.2 0 1 four {[3]}
check_doclist fts3d-4.3.3 0 1 is {[3 0[1]]}
check_doclist fts3d-4.3.4 0 1 test {[3 0[3]]}
check_doclist fts3d-4.3.5 0 1 this {[3 0[0]]}

check_terms fts3d-4.4      1 0 {a four is test that this was}
check_doclist fts3d-4.4.1  1 0 a {[1 0[2]] [2 0[2]] [3 0[2]]}
check_doclist fts3d-4.4.2  1 0 four {[2 0[4]] [3 0[4]]}
check_doclist fts3d-4.4.3  1 0 is {[1 0[1]] [3 0[1]]}
#check_doclist fts3d-4.4.4  1 0 one {[1] [2] [3]}
check_doclist fts3d-4.4.5  1 0 test {[1 0[3]] [2 0[3]] [3 0[3]]}
check_doclist fts3d-4.4.6  1 0 that {[2 0[0]]}
check_doclist fts3d-4.4.7  1 0 this {[1 0[0]] [3 0[0]]}
#check_doclist fts3d-4.4.8  1 0 three {[1] [2] [3]}
#check_doclist fts3d-4.4.9  1 0 two {[1] [2] [3]}
check_doclist fts3d-4.4.10 1 0 was {[2 0[1]]}

# Optimize should leave the result in the level of the highest-level
# prior segment.
do_test fts3d-4.5 {
  execsql {
    SELECT OPTIMIZE(t1) FROM t1 LIMIT 1;
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {{Index optimized} 1 0}

# Identical to fts3d-4.matches.
do_test fts3d-4.5.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} [list {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4} \
        {0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4} \
        {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4}]

check_terms_all fts3d-4.5.1     {a is test that this was}
check_doclist_all fts3d-4.5.1.1 a {[1 0[2]] [2 0[2]] [3 0[2]]}
check_doclist_all fts3d-4.5.1.2 is {[1 0[1]] [3 0[1]]}
check_doclist_all fts3d-4.5.1.3 test {[1 0[3]] [2 0[3]] [3 0[3]]}
check_doclist_all fts3d-4.5.1.4 that {[2 0[0]]}
check_doclist_all fts3d-4.5.1.5 this {[1 0[0]] [3 0[0]]}
check_doclist_all fts3d-4.5.1.6 was {[2 0[1]]}

check_terms fts3d-4.5.2     1 0 {a is test that this was}
check_doclist fts3d-4.5.2.1 1 0 a {[1 0[2]] [2 0[2]] [3 0[2]]}
check_doclist fts3d-4.5.2.2 1 0 is {[1 0[1]] [3 0[1]]}
check_doclist fts3d-4.5.2.3 1 0 test {[1 0[3]] [2 0[3]] [3 0[3]]}
check_doclist fts3d-4.5.2.4 1 0 that {[2 0[0]]}
check_doclist fts3d-4.5.2.5 1 0 this {[1 0[0]] [3 0[0]]}
check_doclist fts3d-4.5.2.6 1 0 was {[2 0[1]]}

# Re-optimizing does nothing.
do_test fts3d-5.0 {
  execsql {
    SELECT OPTIMIZE(t1) FROM t1 LIMIT 1;
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {{Index already optimal} 1 0}

# Even if we move things around, still does nothing.
sqlite3_db_config db DEFENSIVE 0
do_test fts3d-5.1 {
  execsql {
    UPDATE t1_segdir SET level = 2 WHERE level = 1 AND idx = 0;
    SELECT OPTIMIZE(t1) FROM t1 LIMIT 1;
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {{Index already optimal} 2 0}


# ALTER TABLE RENAME should work regardless of the database encoding.
#
do_test fts3d-6.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA encoding=UTF8;
    CREATE VIRTUAL TABLE fts USING fts3(a,b,c);
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {fts_content fts_segdir fts_segments}
do_test fts3d-6.1 {
  db eval {
    ALTER TABLE fts RENAME TO xyz;
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {xyz_content xyz_segdir xyz_segments}
do_test fts3d-6.2 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA encoding=UTF16le;
    CREATE VIRTUAL TABLE fts USING fts3(a,b,c);
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {fts_content fts_segdir fts_segments}
do_test fts3d-6.3 {
  db eval {
    ALTER TABLE fts RENAME TO xyz;
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {xyz_content xyz_segdir xyz_segments}
do_test fts3d-6.4 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA encoding=UTF16be;
    CREATE VIRTUAL TABLE fts USING fts3(a,b,c);
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {fts_content fts_segdir fts_segments}
do_test fts3d-6.5 {
  db eval {
    ALTER TABLE fts RENAME TO xyz;
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {xyz_content xyz_segdir xyz_segments}

# ALTER TABLE RENAME on an FTS3 table following an incr-merge op.
#
do_test fts3d-6.6 {
  execsql { INSERT INTO xyz(xyz) VALUES('merge=2,2') }
  sqlite3 db test.db
  execsql { 
    ALTER TABLE xyz RENAME TO ott;
    SELECT name FROM sqlite_master WHERE name GLOB '???_*' ORDER BY 1;
  }
} {ott_content ott_segdir ott_segments ott_stat}
 

finish_test
