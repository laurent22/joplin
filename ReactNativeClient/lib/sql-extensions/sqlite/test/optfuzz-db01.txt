-- Run this script through the sqlite3 command-line shell in order to generate
-- a database file containing lots of data for testing purposes.
--
-- This script assumes that the "bin2c" program is available on ones $PATH.
-- The "bin2c" program reads a binary file and outputs C-code that creates
-- an array of bytes holding the content of that file.
--
-- This script is designed to create many tables and views all having
-- 5 columns, "a" through "e", and with a variety of integers, short strings,
-- and NULL values.
--
.open -new testdb01.db
PRAGMA page_size=512;
BEGIN;
CREATE TABLE t1(a INTEGER PRIMARY KEY, b INT, c INT, d INT, e INT);
WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<50)
INSERT INTO t1(a,b,c,d,e) SELECT x,abs(random()%51),
   abs(random()%100), abs(random()%51), abs(random()%100) FROM c;
CREATE TABLE t2(a INT, b INT, c INT,d INT,e INT,PRIMARY KEY(b,a))WITHOUT ROWID;
INSERT INTO t2 SELECT * FROM t1;
CREATE TABLE t3(a,b,c,d,e);
INSERT INTO t3 SELECT a,b,c,d,e FROM t1 ORDER BY random() LIMIT 5;
INSERT INTO t3 SELECT null,b,c,d,e FROM t1 ORDER BY random() LIMIT 5;
INSERT INTO t3 SELECT a,null,c,d,e FROM t1 ORDER BY random() LIMIT 5;
INSERT INTO t3 SELECT a,b,null,d,e FROM t1 ORDER BY random() LIMIT 5;
INSERT INTO t3 SELECT a,b,c,null,e FROM t1 ORDER BY random() LIMIT 5;
INSERT INTO t3 SELECT a,b,c,d,null FROM t1 ORDER BY random() LIMIT 5;
INSERT INTO t3 SELECT null,null,null,null,null FROM t1 LIMIT 5;
CREATE INDEX t3x1 ON t3(a,b,c,d,e);
CREATE TABLE t4(a INT UNIQUE NOT NULL, b INT UNIQUE NOT NULL,c,d,e);
INSERT OR IGNORE INTO t4 SELECT a,b,c,d,e FROM t3;
CREATE TABLE t5(a INTEGER PRIMARY KEY, b TEXT UNIQUE,c,d,e);
INSERT INTO t5(b) VALUES
   ('truth'),
   ('works'),
   ('offer'),
   ('can'),
   ('anger'),
   ('wisdom'),
   ('send'),
   ('though'),
   ('save'),
   ('between'),
   ('some'),
   ('wine'),
   ('ark'),
   ('smote'),
   ('therein'),
   ('shew'),
   ('morning'),
   ('dwelt'),
   ('begat'),
   ('nothing'),
   ('war'),
   ('above'),
   ('known'),
   ('sacrifice'),
   ('tell'),
   ('departed'),
   ('thyself'),
   ('places'),
   ('bear'),
   ('part'),
   ('while'),
   ('gone'),
   ('cubits'),
   ('walk'),
   ('long'),
   ('near'),
   ('serve'),
   ('fruit'),
   ('doth'),
   ('poor'),
   ('ways'),
   ('child'),
   ('temple'),
   ('angel'),
   ('inhabitants'),
   ('oil'),
   ('died'),
   ('six'),
   ('tree'),
   ('wrath');
UPDATE t1 SET e=(SELECT b FROM t5 WHERE t5.a=(t1.e%51));
UPDATE t5 SET (c,d,e) = 
   (SELECT c,d,e FROM t1 WHERE t1.a=abs(t5.a+random()/100)%50+1);
UPDATE t2 SET e=(SELECT b FROM t5 WHERE t5.a=(t2.e%51));
UPDATE t3 SET e=(SELECT b FROM t5 WHERE t5.a=t3.e);
CREATE INDEX t1e ON t1(e);
CREATE INDEX t2ed ON t2(e,d);
CREATE VIEW v00(a,b,c,d,e) AS SELECT 1,1,1,1,'one';
CREATE VIEW v10(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t1 WHERE a<>25;
CREATE VIEW v20(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t2 WHERE a<>25;
CREATE VIEW v30(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t3 WHERE a<>25;
CREATE VIEW v40(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t4 WHERE a<>25;
CREATE VIEW v50(a,b) AS SELECT a,b FROM t5 WHERE a<>25;
CREATE VIEW v11(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t1 ORDER BY b LIMIT 10;
CREATE VIEW v21(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t2 ORDER BY b LIMIT 10;
CREATE VIEW v31(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t3 ORDER BY b LIMIT 10;
CREATE VIEW v41(a,b,c,d,e) AS SELECT a,b,c,d,e FROM t4 ORDER BY b LIMIT 10;
CREATE VIEW v51(a,b) AS SELECT a,b FROM t5 ORDER BY b LIMIT 10;
CREATE VIEW v12(a,b,c,d,e) AS
  SELECT sum(a), avg(b), count(*), min(d), e FROM t1 GROUP BY 5;
CREATE VIEW v22(a,b,c,d,e) AS
  SELECT sum(a), avg(b), count(*), min(d), e FROM t2 GROUP BY 5
    HAVING count(*)>1 ORDER BY 3, 1;
CREATE VIEW v32(a,b,c,d,e) AS
  SELECT sum(a), avg(b), count(*), min(d), e FROM t3 GROUP BY 5
    HAVING count(*)>1 ORDER BY 3, 1;
CREATE VIEW v42(a,b,c,d,e) AS
  SELECT sum(a), avg(b), count(*), min(d), e FROM t4 GROUP BY 5
    HAVING min(d)<30 ORDER BY 3, 1;
CREATE VIEW v52(a,b,c,d,e) AS
  SELECT count(*), min(b), substr(b,1,1), min(a), max(a) FROM t5
   GROUP BY 3 ORDER BY 1;

CREATE VIEW v13(a,b,c,d,e) AS
  SELECT a,b,c,d,e FROM t1
  UNION SELECT a,b,c,d,e FROM t2
  UNION SELECT a,b,c,d,e FROM t3;
CREATE VIEW v23(a,b,c,d,e) AS
  SELECT a,b,c,d,e FROM t1
  EXCEPT SELECT a,b,c,d,e FROM t1 WHERE b<25;

CREATE VIEW v60(a,b,c,d,e) AS
  SELECT t1.a,t2.b,t1.c,t2.d,t1.e
    FROM t1 LEFT JOIN t2 ON (t1.a=t2.b);
CREATE VIEW v61(a,b,c,d,e) AS
  SELECT t2.a,t3.b,t2.c,t3.d,t2.e
    FROM t2 LEFT JOIN t3 ON (t2.a=t3.a);
CREATE VIEW v62(a,b,c,d,e) AS
  SELECT t1.a,t2.b,t3.c,t4.d,t5.b
    FROM t1 JOIN t2 ON (t1.a=t2.b)
            JOIN t3 ON (t1.a=t3.a)
            JOIN t4 ON (t4.b=t3.b)
            LEFT JOIN t5 ON (t5.a=t1.c);
CREATE VIEW v70(a,b,c,d,e) AS
  WITH RECURSIVE c0(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c0 WHERE x<9)
  SELECT x, b, c, d, e FROM c0 JOIN t1 ON (t1.a=50-c0.x);
COMMIT;
VACUUM;
.shell bin2c testdb01.db
