# 2018-12-12
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
# Test cases found by Matthew Denton's fuzzer at Chrome.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test fuzz4-100 {
  CREATE TABLE Table0 (Col0  NOT NULL DEFAULT (CURRENT_TIME IS 1 > 1));
  INSERT OR REPLACE INTO Table0 DEFAULT VALUES ;
  SELECT * FROM Table0;
} {0}

do_execsql_test fuzz4-110 {
  CREATE TABLE Table1(
    Col0 TEXT DEFAULT (CASE WHEN 1 IS 3530822107858468864 
                            THEN 1 ELSE quote(1) IS 3530822107858468864 END)
  );
  INSERT INTO Table1 DEFAULT VALUES;
  SELECT * FROM Table1;
} {0}

do_execsql_test fuzz4-200 {
  CREATE TABLE Table2a(
     Col0  NOT NULL   DEFAULT (CURRENT_TIME IS 1  IS NOT 1  > 1)
  );
  INSERT OR REPLACE INTO Table2a DEFAULT VALUES;
  SELECT * FROM Table2a;
} {0}

do_execsql_test fuzz4-210 {
  CREATE TABLE Table2b (Col0  NOT NULL  DEFAULT (CURRENT_TIME  IS NOT FALSE)) ;
  INSERT OR REPLACE INTO Table2b DEFAULT VALUES ;
  SELECT * FROM Table2b;
} {1}

do_execsql_test fuzz4-300 {
  CREATE TABLE Table3 (Col0 DEFAULT (CURRENT_TIMESTAMP BETWEEN 1 AND 1));
  INSERT INTO Table3 DEFAULT VALUES;
  SELECT * FROM Table3;
} {0}

do_execsql_test fuzz4-400 {
  CREATE TABLE Table4 (Col0 DEFAULT (1 BETWEEN CURRENT_TIMESTAMP AND 1));
  INSERT INTO Table4 DEFAULT VALUES;
  SELECT * FROM Table4;
} {0}

do_execsql_test fuzz4-500 {
  CREATE TABLE Table5 (Col0 DEFAULT (1 BETWEEN 1 AND CURRENT_TIMESTAMP));
  INSERT INTO Table5 DEFAULT VALUES;
  SELECT * FROM Table5;
} {1}

do_execsql_test fuzz4-600 {
  CREATE TEMPORARY TABLE Table6(
    Col0 DEFAULT (CASE x'5d' WHEN 1 THEN
        CASE CURRENT_TIMESTAMP WHEN 1 THEN 1 ELSE 1 END
        ELSE CASE WHEN 1 THEN FALSE END  END )
  );
  INSERT INTO temp.Table6 DEFAULT VALUES ;
  SELECT * FROM Table6;
} {0}
do_execsql_test fuzz4-610 {
  WITH TableX AS (SELECT DISTINCT * ORDER BY 1  , 1 COLLATE RTRIM)
      DELETE FROM Table6  WHERE Col0 || +8388608  ;
  SELECT * FROM Table6;
} {}


finish_test
