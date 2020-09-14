# 2007 Sep 12
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2640 has been fixed.
#
# $Id: tkt2640.test,v 1.3 2008/08/04 03:51:24 danielk1977 Exp $
#

# The problem in ticket #2640 was that the query optimizer was 
# not recognizing all uses of tables within subqueries in the
# WHERE clause.  If the subquery contained a compound SELECT,
# then tables that were used by terms of the compound other than
# the last term would not be recognized as dependencies.
# So if one of the SELECT statements within a compound made
# use of a table that occurs later in a join, the query
# optimizer would not recognize this and would try to evaluate
# the subquery too early, before that tables value had been
# established.

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !subquery||!compound {
  finish_test
  return
}

do_test tkt2640-1.1 {
  execsql {
    CREATE TABLE persons(person_id, name);
    INSERT INTO persons VALUES(1,'fred');
    INSERT INTO persons VALUES(2,'barney');
    INSERT INTO persons VALUES(3,'wilma');
    INSERT INTO persons VALUES(4,'pebbles');
    INSERT INTO persons VALUES(5,'bambam');
    CREATE TABLE directors(person_id);
    INSERT INTO directors VALUES(5);
    INSERT INTO directors VALUES(3);
    CREATE TABLE writers(person_id);
    INSERT INTO writers VALUES(2);
    INSERT INTO writers VALUES(3);
    INSERT INTO writers VALUES(4);
    SELECT DISTINCT p.name
      FROM persons p, directors d
     WHERE d.person_id=p.person_id
       AND NOT EXISTS (
             SELECT person_id FROM directors d1 WHERE d1.person_id=p.person_id
             EXCEPT
             SELECT person_id FROM writers w
           );
  }
} {wilma}
do_test tkt2640-1.2 {
  execsql {
    SELECT DISTINCT p.name
      FROM persons p CROSS JOIN directors d
     WHERE d.person_id=p.person_id
       AND NOT EXISTS (
             SELECT person_id FROM directors d1 WHERE d1.person_id=p.person_id
             EXCEPT
             SELECT person_id FROM writers w
           );
  }
} {wilma}
do_test tkt2640-1.3 {
  execsql {
    SELECT DISTINCT p.name
      FROM directors d CROSS JOIN persons p
     WHERE d.person_id=p.person_id
       AND NOT EXISTS (
             SELECT person_id FROM directors d1 WHERE d1.person_id=p.person_id
             EXCEPT
             SELECT person_id FROM writers w
           );
  }
} {wilma}
do_test tkt2640-1.4 {
  execsql {
    SELECT DISTINCT p.name
      FROM persons p, directors d
     WHERE d.person_id=p.person_id
       AND NOT EXISTS (
             SELECT person_id FROM directors d1 WHERE d1.person_id=d.person_id
             EXCEPT
             SELECT person_id FROM writers w
           );
  }
} {wilma}
do_test tkt2640-1.5 {
  execsql {
    SELECT DISTINCT p.name
      FROM persons p CROSS JOIN directors d
     WHERE d.person_id=p.person_id
       AND NOT EXISTS (
             SELECT person_id FROM directors d1 WHERE d1.person_id=d.person_id
             EXCEPT
             SELECT person_id FROM writers w
           );
  }
} {wilma}
do_test tkt2640-1.6 {
  execsql {
    SELECT DISTINCT p.name
      FROM directors d CROSS JOIN persons p
     WHERE d.person_id=p.person_id
       AND NOT EXISTS (
             SELECT person_id FROM directors d1 WHERE d1.person_id=d.person_id
             EXCEPT
             SELECT person_id FROM writers w
           );
  }
} {wilma}



finish_test
