# 2010 April 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to verify that ticket [752e1646fc] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-752e1646fc-1.1 {
  execsql {
    CREATE TABLE "test" ("letter" VARCHAR(1) PRIMARY KEY, "number" INTEGER NOT NULL);
    INSERT INTO "test" ("letter", "number") VALUES('b', 1); 
    INSERT INTO "test" ("letter", "number") VALUES('a', 2); 
    INSERT INTO "test" ("letter", "number") VALUES('c', 2); 
    SELECT DISTINCT "number" FROM (SELECT "letter", "number" FROM "test" ORDER BY "letter", "number" LIMIT 1) AS "test";
  }
} {2}

finish_test
