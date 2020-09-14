# 2017-02-17
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
# This file implements tests for the logic used to estimate when
# running ANALYZE would be beneficial.
#
# Note that this test uses some hard-coded bitmask values from sqliteInt.h.
# If any of the following constants changes:
#
#    define TF_HasStat1   0x0010
#    define TF_StatsUsed  0x0100
#
# then some of the magic numbers in test results below might need to be
# adjusted.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# There is nothing to test if ANALYZE is disable for this build.
# These tests also use "PRAGMA stats" which are only enabled for
# debugging builds.
#
ifcapable {!debug || !analyze || !vtab} {
  finish_test
  return
}

do_execsql_test autoanalyze1-100 {
  -- Build up a test table with some indexes
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d);
  CREATE UNIQUE INDEX t1bc ON t1(b,c);
  CREATE INDEX t1d ON t1(d);
  WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<100)
    INSERT INTO t1(a,b,c,d) SELECT x, x, x, x FROM c;
  -- Verify that the hasStat1 flag is clear on on indexes
  SELECT idx, flgs FROM pragma_stats
   WHERE idx IS NOT NULL
   ORDER BY idx;
  -- Verify that the TF_HasStat1 flag is clear on the table
  SELECT tbl, (flgs & 0x10)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {t1bc 0 t1d 0 t1 0}

# No use of stat1 recorded so far
do_execsql_test autoanalyze1-110 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {0}

# Access using a unique index does not set the TF_StatsUsed flag.
#
do_execsql_test autoanalyze1-200 {
  SELECT * FROM t1 WHERE a=55;
} {55 55 55 55}
do_execsql_test autoanalyze1-201 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {0}

do_execsql_test autoanalyze1-210 {
  SELECT * FROM t1 WHERE a IN (55,199,299);
} {55 55 55 55}
do_execsql_test autoanalyze1-211 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {0}

do_execsql_test autoanalyze1-220 {
  SELECT * FROM t1 WHERE (b,c)=(45,45);
} {45 45 45 45}
do_execsql_test autoanalyze1-221 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {0}

# Any use of the non-unique t1d index triggers the use of stats.
#
sqlite3 db test.db
do_execsql_test autoanalyze1-300 {
  SELECT * FROM t1 WHERE d=45;
} {45 45 45 45}
do_execsql_test autoanalyze1-301 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {1}

sqlite3 db test.db
do_execsql_test autoanalyze1-310 {
  SELECT * FROM t1 WHERE d=45 AND a=45;
} {45 45 45 45}
do_execsql_test autoanalyze1-311 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {0}  ;# The ROWID lookup short-circuits the d=45 constraint

sqlite3 db test.db
do_execsql_test autoanalyze1-320 {
  SELECT * FROM t1 WHERE d=45 AND a IN (45,46);
} {45 45 45 45}
do_execsql_test autoanalyze1-321 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {1}

# Any use of prefix of a unique index triggers the use of stats
#
sqlite3 db test.db
do_execsql_test autoanalyze1-400 {
  SELECT * FROM t1 WHERE b=45;
} {45 45 45 45}
do_execsql_test autoanalyze1-401 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {1}

# The TF_StatsUsed flag is reset when the database is reopened
#
sqlite3 db test.db
do_execsql_test autoanalyze1-500 {
  SELECT (flgs & 0x0100)!=0 FROM pragma_stats WHERE tbl='t1' AND idx IS NULL;
} {0}

finish_test
