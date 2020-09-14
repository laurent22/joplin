# 2009 February 2
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
# This file checks to make sure the "TEMP" or "TEMPORARY" keyword is
# omitted from the schema of a table that is created using that
# keyword.  Ticket #3630.
#
# $Id: tkt3630.test,v 1.1 2009/02/02 18:03:22 drh Exp $
#

set testdir [file dirname $argv0]

source $testdir/tester.tcl

do_test tkt3630-1 {
  db eval {
    CREATE TEMP TABLE temp1(a,b,c);
    SELECT * FROM temp.sqlite_master WHERE sql GLOB '*TEMP*';
  }
} {}
do_test tkt3630-2 {
  db eval {
    CREATE TABLE main1(a,b,c);
    CREATE TEMP TABLE temp2 AS SELECT * FROM main1;
    SELECT * FROM sqlite_temp_master WHERE sql GLOB '*TEMP*';
  }
} {}

ifcapable altertable {
  do_test tkt3630-3 {
    db eval {
      ALTER TABLE temp2 ADD COLUMN d;
      ALTER TABLE temp2 RENAME TO temp2rn;
      SELECT name FROM temp.sqlite_master WHERE name LIKE 'temp2%';
    }
  } {temp2rn}
}

finish_test
