# 2014-03-03
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
# This file verifies that an OP_Copy operation is used instead of OP_SCopy
# in a compound select in a case where the source register might be changed
# before the copy is used.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix selectF

do_execsql_test 1 {
  BEGIN TRANSACTION;
  CREATE TABLE t1(a, b, c);
  INSERT INTO "t1" VALUES(1,'one','I');
  CREATE TABLE t2(d, e, f);
  INSERT INTO "t2" VALUES(5,'ten','XX');
  INSERT INTO "t2" VALUES(6,NULL,NULL);

  CREATE INDEX i1 ON t1(b, a);
  COMMIT;
}

#explain_i {
#  SELECT * FROM t2
#  UNION ALL 
#  SELECT * FROM t1 WHERE a<5 
#  ORDER BY 2, 1
#}

do_execsql_test 2 {
  SELECT * FROM t2
  UNION ALL 
  SELECT * FROM t1 WHERE a<5 
  ORDER BY 2, 1
} {6 {} {} 1 one I 5 ten XX}


  
finish_test
