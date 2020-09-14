# 2007 May 10
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
# This file checks error recovery from malformed SQL strings.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl


proc fuzzcatch {sql} {
  return [lindex [catchsql $sql] 0]
}

do_test fuzz2-1.1 {
  fuzzcatch {SELECT ALL "AAAAAA" . * GROUP BY LIMIT round(1), #12}
} {1}
do_test fuzz2-2.0 {
  fuzzcatch {SELECT + #100}
} {1}
do_test fuzz2-2.1 {
  fuzzcatch {SELECT 1 WHERE ( #61 NOT MATCH ROUND( 1 ) )}
} {1}
do_test fuzz2-2.2 {
  fuzzcatch {SELECT 1 LIMIT NOT #59 COLLATE AAAAAA NOT IN 
    ( "AAAAAA" NOTNULL <= x'414141414141' IS NULL , ( ROUND ( 1.0 ) ) )}
} {1}
do_test fuzz2-2.3 {
  fuzzcatch {INSERT OR REPLACE INTO AAAAAA . "AAAAAA" ( "AAAAAA" ) SELECT DISTINCT * , ( SELECT #252 IN ( SELECT DISTINCT AAAAAA . * ) )}
} {1}
do_test fuzz2-2.4 {
  fuzzcatch {SELECT 1 LIMIT NOT #59 COLLATE AAAAAA NOT IN round(1.0)}
} {1}
do_test fuzz2-2.5 {
  fuzzcatch {SELECT( #239 )}
} {1}
do_test fuzz2-2.6 {
  fuzzcatch {DELETE FROM AAAAAA WHERE #65 NOT NULL}
} {1}
do_test fuzz2-2.7 {
  fuzzcatch {ATTACH ROUND( 1.0 ) in  AAAAAA . "AAAAAA" AS #122 ISNULL}
} {1}
do_test fuzz2-2.8 {
  fuzzcatch {SELECT 1 LIMIT  #122 ISNULL}
} {1}
do_test fuzz2-2.9 {
  fuzzcatch {CREATE VIEW AAAAAA . "AAAAAA" AS SELECT DISTINCT #162 IS NULL "AAAAAA"}
} {1}
do_test fuzz2-2.10 {
  fuzzcatch {DELETE FROM AAAAAA WHERE #202 IS NOT NULL ISNULL}
} {1}
do_test fuzz2-2.11 {
  fuzzcatch {UPDATE OR IGNORE "AAAAAA" . "AAAAAA" SET "AAAAAA" = NOT #96}
} {1}
do_test fuzz2-2.12 {
  fuzzcatch {SELECT - #196}
} {1}

ifcapable {trigger} {  # Only do the following tests if triggers are enabled

do_test fuzz2-3.0 {
  fuzzcatch {CREATE TRIGGER "AAAAAA" . "AAAAAA" AFTER UPDATE OF "AAAAAA" , "AAAAAA" ON "AAAAAA" . "AAAAAA" FOR EACH ROW BEGIN UPDATE AAAAAA SET "AAAAAA" = #162;  END}
} {1}
do_test fuzz2-3.1 {
  fuzzcatch {CREATE TRIGGER IF NOT EXISTS "AAAAAA" UPDATE ON "AAAAAA" . AAAAAA FOR EACH ROW BEGIN DELETE FROM "AAAAAA" ; INSERT INTO AAAAAA ( "AAAAAA" ) SELECT DISTINCT "AAAAAA" "AAAAAA" , #167 AAAAAA , "AAAAAA" . * ORDER BY "AAAAAA" ASC , x'414141414141' BETWEEN RAISE ( FAIL , "AAAAAA" ) AND AAAAAA ( * ) NOT NULL DESC LIMIT AAAAAA ; REPLACE INTO AAAAAA ( AAAAAA ) VALUES ( AAAAAA ( * ) ) ; END}
} {1}
do_test fuzz2-3.2 {
  fuzzcatch {CREATE TEMP TRIGGER IF NOT EXISTS AAAAAA . "AAAAAA" BEFORE UPDATE OF "AAAAAA" ON AAAAAA . "AAAAAA" BEGIN SELECT ALL * , #175 "AAAAAA" FROM "AAAAAA" . AAAAAA;  END}
} {1}

} ;# End of ifcapable {trigger}

do_test fuzz2-4.0 {
  fuzzcatch {ATTACH DATABASE #168 AS whatever}
} {1}
do_test fuzz2-4.1 {
  fuzzcatch {DETACH #133}
} {1}
do_test fuzz2-5.0 {
  fuzzcatch {SELECT 1 LIMIT ( SELECT DISTINCT * , AAAAAA , * , AAAAAA , "AAAAAA" . * FROM "AAAAAA" ON ROUND( 1 ) COLLATE AAAAAA OR "AAAAAA" USING ( AAAAAA , "AAAAAA" ) WHERE ROUND( 1 ) GROUP BY ORDER BY #84 ASC , #44 DESC , ( SELECT "AAAAAA" . * , "AAAAAA" . * FROM , ( ) "AAAAAA" USING ( )}
} {1}
do_test fuzz2-5.1 {
  fuzzcatch {SELECT 1 WHERE 1 == AAAAAA ( * ) BETWEEN + - ~ + "AAAAAA" . AAAAAA | RAISE ( IGNORE ) COLLATE AAAAAA NOT IN ( SELECT DISTINCT "AAAAAA" . * , * , * WHERE ( SELECT ALL AAAAAA AS "AAAAAA" HAVING CAST ( "AAAAAA" . "AAAAAA" . "AAAAAA" AS AAAAAA ) ORDER BY , , IS NULL ASC , ~ AND DESC LIMIT ( ( "AAAAAA" ) NOT BETWEEN ( ) NOT IN ( ) AND AAAAAA ( ) IS NOT NULL ) OFFSET AAAAAA ( ALL , , ) ) GROUP BY ORDER BY "AAAAAA" . AAAAAA ASC , NULL IN ( SELECT UNION ALL SELECT ALL WHERE HAVING ORDER BY LIMIT UNION SELECT DISTINCT FROM ( ) WHERE + HAVING >> ORDER BY LIMIT . . , "AAAAAA" ) , CAST ( ~ "AAAAAA" . AAAAAA AS "AAAAAA" AAAAAA "AAAAAA" ( + 4294967295 , - 4294967296.0 ) ) ASC LIMIT AAAAAA INTERSECT SELECT ALL * GROUP BY , AAAAAA ( DISTINCT , ) != #241 NOT IN ( , , ) , , CTIME_KW HAVING AAAAAA ORDER BY #103 DESC , #81 ASC LIMIT AAAAAA OFFSET ~ AAAAAA ( ALL AAAAAA . AAAAAA >= AAAAAA . "AAAAAA" . "AAAAAA" ) ) NOTNULL NOT NULL}
} {1}
do_test fuzz2-5.2 {
  fuzzcatch {SELECT 1 WHERE 1 == AAAAAA ( * ) BETWEEN + - ~ + "AAAAAA" . AAAAAA | RAISE ( IGNORE ) COLLATE AAAAAA NOT IN ( SELECT DISTINCT "AAAAAA" . * , * , * WHERE ( SELECT ALL AAAAAA AS "AAAAAA" HAVING CAST ( "AAAAAA" . "AAAAAA" . "AAAAAA" AS AAAAAA ) ORDER BY , , IS NULL ASC , ~ AND DESC LIMIT ( ( "AAAAAA" ) NOT BETWEEN ( ) NOT IN ( ) AND AAAAAA ( ) IS NOT NULL ) OFFSET AAAAAA ( ALL , , ) ) GROUP BY ORDER BY "AAAAAA" . AAAAAA ASC , NULL IN ( SELECT UNION ALL SELECT ALL WHERE HAVING ORDER BY LIMIT UNION SELECT DISTINCT FROM ( ) WHERE + HAVING >> ORDER BY LIMIT . . , "AAAAAA" ) , CAST ( ~ "AAAAAA" . AAAAAA AS "AAAAAA" AAAAAA "AAAAAA" ( + 4294967295 , - 4294967296.0 ) ) ASC LIMIT AAAAAA INTERSECT SELECT ALL * GROUP BY , AAAAAA ( DISTINCT , ) != #241 NOT IN ( , , ) , , CTIME_KW HAVING AAAAAA ORDER BY #103 DESC , #81 ASC LIMIT AAAAAA OFFSET ~ AAAAAA ( ALL AAAAAA . AAAAAA >= AAAAAA . "AAAAAA" . "AAAAAA" ) ) NOTNULL NOT NULL}
} {1}
do_test fuzz2-5.3 {
  fuzzcatch {UPDATE "AAAAAA" SET "AAAAAA" = - EXISTS ( SELECT DISTINCT * , * ORDER BY #202 ASC , #147 , ~ AAAAAA . "AAAAAA" ASC LIMIT AAAAAA . "AAAAAA" , RAISE ( ABORT , AAAAAA ) UNION ALL SELECT DISTINCT AAAAAA . * , * FROM ( SELECT DISTINCT}
} {1}
do_test fuzz2-5.4 {
  fuzzcatch {REPLACE INTO AAAAAA SELECT DISTINCT "AAAAAA" . * WHERE AAAAAA ( AAAAAA ( ) ) GROUP BY AAAAAA . AAAAAA . "AAAAAA" IN "AAAAAA" | AAAAAA ( ALL , ) ORDER BY #238, #92 DESC LIMIT 0 OFFSET - RAISE ( IGNORE ) NOT NULL > RAISE ( IGNORE ) IS NULL}
} {1}
do_test fuzz2-5.5 {
  fuzzcatch {SELECT ALL * GROUP BY EXISTS ( SELECT "AAAAAA" . * , AAAAAA ( * ) AS AAAAAA FROM "AAAAAA" . "AAAAAA" AS "AAAAAA" USING ( AAAAAA , "AAAAAA" , "AAAAAA" ) WHERE AAAAAA ( DISTINCT ) - RAISE ( FAIL , "AAAAAA" ) HAVING "AAAAAA" . "AAAAAA" . AAAAAA ORDER BY #182 , #55 ) BETWEEN EXISTS ( SELECT ALL * FROM ( ( }
} {1}

# Test cases discovered by Michal Zalewski on 2015-01-03 and reported on the
# sqlite-users mailing list.  All of these cases cause segfaults in 
# SQLite 3.8.7.4 and earlier.
#
do_test fuzz2-6.1 {
  catchsql {SELECT n()AND+#0;}
} {1 {near "#0": syntax error}}
do_test fuzz2-6.2 {
  catchsql {SELECT strftime()}
} {0 {{}}}
do_test fuzz2-6.3 {
  catchsql {DETACH(SELECT group_concat(q));}
} {1 {no such column: q}}
do_test fuzz2-6.4a {
  db eval {DROP TABLE IF EXISTS t0; CREATE TABLE t0(t);}
  catchsql {INSERT INTO t0 SELECT strftime();}
} {0 {}}
do_test fuzz2-6.4b {
  db eval {SELECT quote(t) FROM t0} 
} {NULL}

# Another test case discovered by Michal Zalewski, this on on 2015-01-22.
# Ticket 32b63d542433ca6757cd695aca42addf8ed67aa6
#
do_test fuzz2-7.1 {
  catchsql {select e.*,0 from(s,(L))e;}
} {1 {no such table: s}}
do_test fuzz2-7.2 {
  catchsql {SELECT c.* FROM (a,b) AS c}
} {1 {no such table: a}}


finish_test
