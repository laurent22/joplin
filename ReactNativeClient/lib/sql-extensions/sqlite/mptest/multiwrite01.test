/*
** This script sets up five different tasks all writing and updating
** the database at the same time, but each in its own table.
*/
--task 1 build-t1
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  --sleep 1
  INSERT INTO t1 VALUES(1, randomblob(2000));
  INSERT INTO t1 VALUES(2, randomblob(1000));
  --sleep 1
  INSERT INTO t1 SELECT a+2, randomblob(1500) FROM t1;
  INSERT INTO t1 SELECT a+4, randomblob(1500) FROM t1;
  INSERT INTO t1 SELECT a+8, randomblob(1500) FROM t1;
  --sleep 1
  INSERT INTO t1 SELECT a+16, randomblob(1500) FROM t1;
  --sleep 1
  INSERT INTO t1 SELECT a+32, randomblob(1500) FROM t1;
  SELECT count(*) FROM t1;
  --match 64
  SELECT avg(length(b)) FROM t1;
  --match 1500.0
  --sleep 2
  UPDATE t1 SET b='x'||a||'y';
  SELECT sum(length(b)) FROM t1;
  --match 247
  SELECT a FROM t1 WHERE b='x17y';
  --match 17
  CREATE INDEX t1b ON t1(b);
  SELECT a FROM t1 WHERE b='x17y';
  --match 17
  SELECT a FROM t1 WHERE b GLOB 'x2?y' ORDER BY b DESC LIMIT 5;
  --match 29 28 27 26 25
--end


--task 2 build-t2
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b);
  --sleep 1
  INSERT INTO t2 VALUES(1, randomblob(2000));
  INSERT INTO t2 VALUES(2, randomblob(1000));
  --sleep 1
  INSERT INTO t2 SELECT a+2, randomblob(1500) FROM t2;
  INSERT INTO t2 SELECT a+4, randomblob(1500) FROM t2;
  INSERT INTO t2 SELECT a+8, randomblob(1500) FROM t2;
  --sleep 1
  INSERT INTO t2 SELECT a+16, randomblob(1500) FROM t2;
  --sleep 1
  INSERT INTO t2 SELECT a+32, randomblob(1500) FROM t2;
  SELECT count(*) FROM t2;
  --match 64
  SELECT avg(length(b)) FROM t2;
  --match 1500.0
  --sleep 2
  UPDATE t2 SET b='x'||a||'y';
  SELECT sum(length(b)) FROM t2;
  --match 247
  SELECT a FROM t2 WHERE b='x17y';
  --match 17
  CREATE INDEX t2b ON t2(b);
  SELECT a FROM t2 WHERE b='x17y';
  --match 17
  SELECT a FROM t2 WHERE b GLOB 'x2?y' ORDER BY b DESC LIMIT 5;
  --match 29 28 27 26 25
--end

--task 3 build-t3
  DROP TABLE IF EXISTS t3;
  CREATE TABLE t3(a INTEGER PRIMARY KEY, b);
  --sleep 1
  INSERT INTO t3 VALUES(1, randomblob(2000));
  INSERT INTO t3 VALUES(2, randomblob(1000));
  --sleep 1
  INSERT INTO t3 SELECT a+2, randomblob(1500) FROM t3;
  INSERT INTO t3 SELECT a+4, randomblob(1500) FROM t3;
  INSERT INTO t3 SELECT a+8, randomblob(1500) FROM t3;
  --sleep 1
  INSERT INTO t3 SELECT a+16, randomblob(1500) FROM t3;
  --sleep 1
  INSERT INTO t3 SELECT a+32, randomblob(1500) FROM t3;
  SELECT count(*) FROM t3;
  --match 64
  SELECT avg(length(b)) FROM t3;
  --match 1500.0
  --sleep 2
  UPDATE t3 SET b='x'||a||'y';
  SELECT sum(length(b)) FROM t3;
  --match 247
  SELECT a FROM t3 WHERE b='x17y';
  --match 17
  CREATE INDEX t3b ON t3(b);
  SELECT a FROM t3 WHERE b='x17y';
  --match 17
  SELECT a FROM t3 WHERE b GLOB 'x2?y' ORDER BY b DESC LIMIT 5;
  --match 29 28 27 26 25
--end

--task 4 build-t4
  DROP TABLE IF EXISTS t4;
  CREATE TABLE t4(a INTEGER PRIMARY KEY, b);
  --sleep 1
  INSERT INTO t4 VALUES(1, randomblob(2000));
  INSERT INTO t4 VALUES(2, randomblob(1000));
  --sleep 1
  INSERT INTO t4 SELECT a+2, randomblob(1500) FROM t4;
  INSERT INTO t4 SELECT a+4, randomblob(1500) FROM t4;
  INSERT INTO t4 SELECT a+8, randomblob(1500) FROM t4;
  --sleep 1
  INSERT INTO t4 SELECT a+16, randomblob(1500) FROM t4;
  --sleep 1
  INSERT INTO t4 SELECT a+32, randomblob(1500) FROM t4;
  SELECT count(*) FROM t4;
  --match 64
  SELECT avg(length(b)) FROM t4;
  --match 1500.0
  --sleep 2
  UPDATE t4 SET b='x'||a||'y';
  SELECT sum(length(b)) FROM t4;
  --match 247
  SELECT a FROM t4 WHERE b='x17y';
  --match 17
  CREATE INDEX t4b ON t4(b);
  SELECT a FROM t4 WHERE b='x17y';
  --match 17
  SELECT a FROM t4 WHERE b GLOB 'x2?y' ORDER BY b DESC LIMIT 5;
  --match 29 28 27 26 25
--end

--task 5 build-t5
  DROP TABLE IF EXISTS t5;
  CREATE TABLE t5(a INTEGER PRIMARY KEY, b);
  --sleep 1
  INSERT INTO t5 VALUES(1, randomblob(2000));
  INSERT INTO t5 VALUES(2, randomblob(1000));
  --sleep 1
  INSERT INTO t5 SELECT a+2, randomblob(1500) FROM t5;
  INSERT INTO t5 SELECT a+4, randomblob(1500) FROM t5;
  INSERT INTO t5 SELECT a+8, randomblob(1500) FROM t5;
  --sleep 1
  INSERT INTO t5 SELECT a+16, randomblob(1500) FROM t5;
  --sleep 1
  INSERT INTO t5 SELECT a+32, randomblob(1500) FROM t5;
  SELECT count(*) FROM t5;
  --match 64
  SELECT avg(length(b)) FROM t5;
  --match 1500.0
  --sleep 2
  UPDATE t5 SET b='x'||a||'y';
  SELECT sum(length(b)) FROM t5;
  --match 247
  SELECT a FROM t5 WHERE b='x17y';
  --match 17
  CREATE INDEX t5b ON t5(b);
  SELECT a FROM t5 WHERE b='x17y';
  --match 17
  SELECT a FROM t5 WHERE b GLOB 'x2?y' ORDER BY b DESC LIMIT 5;
  --match 29 28 27 26 25
--end

--wait all
SELECT count(*), sum(length(b)) FROM t1;
--match 64 247
SELECT count(*), sum(length(b)) FROM t2;
--match 64 247
SELECT count(*), sum(length(b)) FROM t3;
--match 64 247
SELECT count(*), sum(length(b)) FROM t4;
--match 64 247
SELECT count(*), sum(length(b)) FROM t5;
--match 64 247

--task 1
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 5
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 3
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 2
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 4
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--wait all

--task 5
  DROP INDEX t5b;
  --sleep 5
  PRAGMA integrity_check(10);
  --match ok
  CREATE INDEX t5b ON t5(b DESC);
--end
--task 3
  DROP INDEX t3b;
  --sleep 5
  PRAGMA integrity_check(10);
  --match ok
  CREATE INDEX t3b ON t3(b DESC);
--end
--task 1
  DROP INDEX t1b;
  --sleep 5
  PRAGMA integrity_check(10);
  --match ok
  CREATE INDEX t1b ON t1(b DESC);
--end
--task 2
  DROP INDEX t2b;
  --sleep 5
  PRAGMA integrity_check(10);
  --match ok
  CREATE INDEX t2b ON t2(b DESC);
--end
--task 4
  DROP INDEX t4b;
  --sleep 5
  PRAGMA integrity_check(10);
  --match ok
  CREATE INDEX t4b ON t4(b DESC);
--end
--wait all

--task 1
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 5
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 3
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 2
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--task 4
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
--end
--wait all

VACUUM;
PRAGMA integrity_check(10);
--match ok

--task 1
  UPDATE t1 SET b=randomblob(20000);
  --sleep 5
  UPDATE t1 SET b='x'||a||'y';
  SELECT a FROM t1 WHERE b='x63y';
  --match 63
--end
--task 2
  UPDATE t2 SET b=randomblob(20000);
  --sleep 5
  UPDATE t2 SET b='x'||a||'y';
  SELECT a FROM t2 WHERE b='x63y';
  --match 63
--end
--task 3
  UPDATE t3 SET b=randomblob(20000);
  --sleep 5
  UPDATE t3 SET b='x'||a||'y';
  SELECT a FROM t3 WHERE b='x63y';
  --match 63
--end
--task 4
  UPDATE t4 SET b=randomblob(20000);
  --sleep 5
  UPDATE t4 SET b='x'||a||'y';
  SELECT a FROM t4 WHERE b='x63y';
  --match 63
--end
--task 5
  UPDATE t5 SET b=randomblob(20000);
  --sleep 5
  UPDATE t5 SET b='x'||a||'y';
  SELECT a FROM t5 WHERE b='x63y';
  --match 63
--end
--wait all

--task 1
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
  PRAGMA integrity_check;
  --match ok
--end
--task 5
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
  PRAGMA integrity_check;
  --match ok
--end
--task 3
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
  PRAGMA integrity_check;
  --match ok
--end
--task 2
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
  PRAGMA integrity_check;
  --match ok
--end
--task 4
  SELECT t1.a FROM t1, t2
   WHERE t2.b GLOB 'x3?y' AND t1.b=('x'||(t2.a+3)||'y')
   ORDER BY t1.a LIMIT 4
  --match 33 34 35 36
  SELECT t3.a FROM t3, t4
   WHERE t4.b GLOB 'x4?y' AND t3.b=('x'||(t4.a+5)||'y')
   ORDER BY t3.a LIMIT 7
  --match 45 46 47 48 49 50 51
  PRAGMA integrity_check;
  --match ok
--end
--wait all
