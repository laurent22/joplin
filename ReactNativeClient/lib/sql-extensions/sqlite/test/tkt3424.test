# 2008 October 06
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
#
# $Id: tkt3424.test,v 1.2 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3424-1.1 {
  execsql {
    CREATE TABLE names(id INTEGER, data TEXT, code TEXT);
    INSERT INTO names VALUES(1,'E1','AAA');
    INSERT INTO names VALUES(2,NULL,'BBB');

    CREATE TABLE orig(code TEXT, data TEXT);
    INSERT INTO orig VALUES('AAA','E1');
    INSERT INTO orig VALUES('AAA','E2');
    INSERT INTO orig VALUES('AAA','E3');
    INSERT INTO orig VALUES('AAA','E4');
    INSERT INTO orig VALUES('AAA','E5');
  }
} {}

do_test tkt3424-1.2 {
  execsql {
    SELECT * FROM 
    names LEFT OUTER JOIN orig
    ON names.data = orig.data AND names.code = orig.code;
  }
} {1 E1 AAA AAA E1 2 {} BBB {} {}}

do_test tkt3424-1.3 {
  execsql { CREATE INDEX udx_orig_code_data ON orig(code, data) }
} {}

do_test tkt3424-1.4 {
  execsql {
    SELECT * FROM 
    names LEFT OUTER JOIN orig
    ON names.data = orig.data AND names.code = orig.code;
  }
} {1 E1 AAA AAA E1 2 {} BBB {} {}}

finish_test
