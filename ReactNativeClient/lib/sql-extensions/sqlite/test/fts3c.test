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
# This file exercises some new testing functions in the FTS3 module,
# and then uses them to do some basic tests that FTS3 is internally
# working as expected.
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
  do_test $test [list fts3_doclist t1 $term $where] $doclist
}
proc check_doclist_all {test term doclist} {
  do_test $test [list fts3_doclist t1 $term 1] $doclist
}

#*************************************************************************
# Test the segments resulting from straight-forward inserts.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
}

# Check for expected segments and expected matches.
do_test fts3c-1.0.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0 0 1 0 2}
do_test fts3c-1.0.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} [list {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4} \
        {0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4} \
        {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4}]

# Check the specifics of the segments constructed.
# Logical view of entire index.
check_terms_all   fts3c-1.0.1   {a is test that this was}
check_doclist_all fts3c-1.0.1.1 a {[1 0[2]] [2 0[2]] [3 0[2]]}
check_doclist_all fts3c-1.0.1.2 is {[1 0[1]] [3 0[1]]}
check_doclist_all fts3c-1.0.1.3 test {[1 0[3]] [2 0[3]] [3 0[3]]}
check_doclist_all fts3c-1.0.1.4 that {[2 0[0]]}
check_doclist_all fts3c-1.0.1.5 this {[1 0[0]] [3 0[0]]}
check_doclist_all fts3c-1.0.1.6 was {[2 0[1]]}

# Segment 0,0
check_terms   fts3c-1.0.2   0 0 {a is test this}
check_doclist fts3c-1.0.2.1 0 0 a {[1 0[2]]}
check_doclist fts3c-1.0.2.2 0 0 is {[1 0[1]]}
check_doclist fts3c-1.0.2.3 0 0 test {[1 0[3]]}
check_doclist fts3c-1.0.2.4 0 0 this {[1 0[0]]}

# Segment 0,1
check_terms   fts3c-1.0.3   0 1 {a test that was}
check_doclist fts3c-1.0.3.1 0 1 a {[2 0[2]]}
check_doclist fts3c-1.0.3.2 0 1 test {[2 0[3]]}
check_doclist fts3c-1.0.3.3 0 1 that {[2 0[0]]}
check_doclist fts3c-1.0.3.4 0 1 was {[2 0[1]]}

# Segment 0,2
check_terms   fts3c-1.0.4   0 2 {a is test this}
check_doclist fts3c-1.0.4.1 0 2 a {[3 0[2]]}
check_doclist fts3c-1.0.4.2 0 2 is {[3 0[1]]}
check_doclist fts3c-1.0.4.3 0 2 test {[3 0[3]]}
check_doclist fts3c-1.0.4.4 0 2 this {[3 0[0]]}

#*************************************************************************
# Test the segments resulting from inserts followed by a delete.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
  DELETE FROM t1 WHERE docid = 1;
}

do_test fts3c-1.1.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0 0 1 0 2 0 3}
do_test fts3c-1.1.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} {{0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4} {0 0 0 4 0 4 5 2 0 3 8 1 0 5 10 4}}

check_terms_all fts3c-1.1.1 {a is test that this was}
check_doclist_all fts3c-1.1.1.1 a {[2 0[2]] [3 0[2]]}
check_doclist_all fts3c-1.1.1.2 is {[3 0[1]]}
check_doclist_all fts3c-1.1.1.3 test {[2 0[3]] [3 0[3]]}
check_doclist_all fts3c-1.1.1.4 that {[2 0[0]]}
check_doclist_all fts3c-1.1.1.5 this {[3 0[0]]}
check_doclist_all fts3c-1.1.1.6 was {[2 0[1]]}

check_terms fts3c-1.1.2 0 0 {a is test this}
check_doclist fts3c-1.1.2.1 0 0 a {[1 0[2]]}
check_doclist fts3c-1.1.2.2 0 0 is {[1 0[1]]}
check_doclist fts3c-1.1.2.3 0 0 test {[1 0[3]]}
check_doclist fts3c-1.1.2.4 0 0 this {[1 0[0]]}

check_terms fts3c-1.1.3 0 1 {a test that was}
check_doclist fts3c-1.1.3.1 0 1 a {[2 0[2]]}
check_doclist fts3c-1.1.3.2 0 1 test {[2 0[3]]}
check_doclist fts3c-1.1.3.3 0 1 that {[2 0[0]]}
check_doclist fts3c-1.1.3.4 0 1 was {[2 0[1]]}

check_terms fts3c-1.1.4 0 2 {a is test this}
check_doclist fts3c-1.1.4.1 0 2 a {[3 0[2]]}
check_doclist fts3c-1.1.4.2 0 2 is {[3 0[1]]}
check_doclist fts3c-1.1.4.3 0 2 test {[3 0[3]]}
check_doclist fts3c-1.1.4.4 0 2 this {[3 0[0]]}

check_terms fts3c-1.1.5 0 3 {a is test this}
check_doclist fts3c-1.1.5.1 0 3 a {[1]}
check_doclist fts3c-1.1.5.2 0 3 is {[1]}
check_doclist fts3c-1.1.5.3 0 3 test {[1]}
check_doclist fts3c-1.1.5.4 0 3 this {[1]}

#*************************************************************************
# Test results when all references to certain tokens are deleted.
db eval {
  DROP TABLE IF EXISTS t1;
  CREATE VIRTUAL TABLE t1 USING fts3(c);
  INSERT INTO t1 (docid, c) VALUES (1, 'This is a test');
  INSERT INTO t1 (docid, c) VALUES (2, 'That was a test');
  INSERT INTO t1 (docid, c) VALUES (3, 'This is a test');
  DELETE FROM t1 WHERE docid IN (1,3);
}

# Still 4 segments because 0,3 will contain deletes for docid 1 and 3.
do_test fts3c-1.2.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0 0 1 0 2 0 3}
do_test fts3c-1.2.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} {{0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4}}

check_terms_all fts3c-1.2.1 {a is test that this was}
check_doclist_all fts3c-1.2.1.1 a {[2 0[2]]}
check_doclist_all fts3c-1.2.1.2 is {}
check_doclist_all fts3c-1.2.1.3 test {[2 0[3]]}
check_doclist_all fts3c-1.2.1.4 that {[2 0[0]]}
check_doclist_all fts3c-1.2.1.5 this {}
check_doclist_all fts3c-1.2.1.6 was {[2 0[1]]}

check_terms fts3c-1.2.2 0 0 {a is test this}
check_doclist fts3c-1.2.2.1 0 0 a {[1 0[2]]}
check_doclist fts3c-1.2.2.2 0 0 is {[1 0[1]]}
check_doclist fts3c-1.2.2.3 0 0 test {[1 0[3]]}
check_doclist fts3c-1.2.2.4 0 0 this {[1 0[0]]}

check_terms fts3c-1.2.3 0 1 {a test that was}
check_doclist fts3c-1.2.3.1 0 1 a {[2 0[2]]}
check_doclist fts3c-1.2.3.2 0 1 test {[2 0[3]]}
check_doclist fts3c-1.2.3.3 0 1 that {[2 0[0]]}
check_doclist fts3c-1.2.3.4 0 1 was {[2 0[1]]}

check_terms fts3c-1.2.4 0 2 {a is test this}
check_doclist fts3c-1.2.4.1 0 2 a {[3 0[2]]}
check_doclist fts3c-1.2.4.2 0 2 is {[3 0[1]]}
check_doclist fts3c-1.2.4.3 0 2 test {[3 0[3]]}
check_doclist fts3c-1.2.4.4 0 2 this {[3 0[0]]}

check_terms fts3c-1.2.5 0 3 {a is test this}
check_doclist fts3c-1.2.5.1 0 3 a {[1] [3]}
check_doclist fts3c-1.2.5.2 0 3 is {[1] [3]}
check_doclist fts3c-1.2.5.3 0 3 test {[1] [3]}
check_doclist fts3c-1.2.5.4 0 3 this {[1] [3]}

#*************************************************************************
# Test results when everything is optimized manually.
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
do_test fts3c-1.3.segments {
  execsql {
    SELECT level, idx FROM t1_segdir ORDER BY level, idx;
  }
} {0 0}
do_test fts3c-1.3.matches {
  execsql {
    SELECT OFFSETS(t1) FROM t1
     WHERE t1 MATCH 'this OR that OR was OR a OR is OR test' ORDER BY docid;
  }
} {{0 1 0 4 0 2 5 3 0 3 9 1 0 5 11 4}}

check_terms_all fts3c-1.3.1 {a test that was}
check_doclist_all fts3c-1.3.1.1 a {[2 0[2]]}
check_doclist_all fts3c-1.3.1.2 test {[2 0[3]]}
check_doclist_all fts3c-1.3.1.3 that {[2 0[0]]}
check_doclist_all fts3c-1.3.1.4 was {[2 0[1]]}

check_terms fts3c-1.3.2 0 0 {a test that was}
check_doclist fts3c-1.3.2.1 0 0 a {[2 0[2]]}
check_doclist fts3c-1.3.2.2 0 0 test {[2 0[3]]}
check_doclist fts3c-1.3.2.3 0 0 that {[2 0[0]]}
check_doclist fts3c-1.3.2.4 0 0 was {[2 0[1]]}

finish_test
