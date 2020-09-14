# 2018 May 19
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

source [file join [file dirname $argv0] pg_common.tcl]

#=========================================================================


start_test window2 "2018 May 19"

ifcapable !windowfunc

execsql_test 1.0 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b TEXT, c TEXT, d INTEGER);
  INSERT INTO t1 VALUES(1, 'odd',  'one',   1);
  INSERT INTO t1 VALUES(2, 'even', 'two',   2);
  INSERT INTO t1 VALUES(3, 'odd',  'three', 3);
  INSERT INTO t1 VALUES(4, 'even', 'four',  4);
  INSERT INTO t1 VALUES(5, 'odd',  'five',  5);
  INSERT INTO t1 VALUES(6, 'even', 'six',   6);
}

execsql_test 1.1 {
  SELECT c, sum(d) OVER (PARTITION BY b ORDER BY c) FROM t1;
}

execsql_test 1.2 {
  SELECT sum(d) OVER () FROM t1;
}

execsql_test 1.3 {
  SELECT sum(d) OVER (PARTITION BY b) FROM t1;
}

==========
execsql_test 2.1 {
  SELECT a, sum(d) OVER (
    ORDER BY d
    ROWS BETWEEN 1000 PRECEDING AND 1 FOLLOWING
  ) FROM t1
}
execsql_test 2.2 {
  SELECT a, sum(d) OVER (
    ORDER BY d
    ROWS BETWEEN 1000 PRECEDING AND 1000 FOLLOWING
  ) FROM t1
}
execsql_test 2.3 {
  SELECT a, sum(d) OVER (
    ORDER BY d
    ROWS BETWEEN 1 PRECEDING AND 1000 FOLLOWING
  ) FROM t1
}
execsql_test 2.4 {
  SELECT a, sum(d) OVER (
    ORDER BY d
    ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) FROM t1
}
execsql_test 2.5 {
  SELECT a, sum(d) OVER (
    ORDER BY d
    ROWS BETWEEN 1 PRECEDING AND 0 FOLLOWING
  ) FROM t1
}

execsql_test 2.6 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) FROM t1
}

execsql_test 2.7 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 0 PRECEDING AND 0 FOLLOWING
  ) FROM t1
}

execsql_test 2.8 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING
  ) FROM t1
}

execsql_test 2.9 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN UNBOUNDED PRECEDING AND 2 FOLLOWING
  ) FROM t1
}

execsql_test 2.10 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING
  ) FROM t1
}

execsql_test 2.11 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) FROM t1
}

execsql_test 2.13 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN 2 PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.14 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING
  ) FROM t1
}

execsql_test 2.15 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 1 PRECEDING AND 0 PRECEDING
  ) FROM t1
}

execsql_test 2.16 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING
  ) FROM t1
}

execsql_test 2.17 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 1 PRECEDING AND 2 PRECEDING
  ) FROM t1
}

execsql_test 2.18 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN UNBOUNDED PRECEDING AND 2 PRECEDING
  ) FROM t1
}

execsql_test 2.19 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 1 FOLLOWING AND 3 FOLLOWING
  ) FROM t1
}

execsql_test 2.20 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN 1 FOLLOWING AND 2 FOLLOWING
  ) FROM t1
}

execsql_test 2.21 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.22 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.23 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.24 {
  SELECT a, sum(d) OVER (
    PARTITION BY a%2
    ORDER BY d 
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.25 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.26 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 2.27 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    ROWS BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t1
}

execsql_test 2.28 {
  SELECT a, sum(d) OVER (
    PARTITION BY b
    ORDER BY d 
    ROWS BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t1
}

execsql_test 2.29 {
  SELECT a, sum(d) OVER (
    ORDER BY d 
    RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t1
}
execsql_test 2.30 {
  SELECT a, sum(d) OVER (
    ORDER BY b 
    RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 3.1 {
  SELECT a, sum(d) OVER (
    PARTITION BY b ORDER BY d
    RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 3.2 {
  SELECT a, sum(d) OVER (
    ORDER BY b
    RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 3.3 {
  SELECT a, sum(d) OVER (
    ORDER BY d
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t1
}

execsql_test 3.4 {
  SELECT a, sum(d) OVER (
    ORDER BY d/2
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) FROM t1
}

#puts $::fd finish_test

==========

execsql_test 4.0 {
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b INTEGER);
  INSERT INTO t2(a, b) VALUES
  (1,0), (2,74), (3,41), (4,74), (5,23), (6,99), (7,26), (8,33), (9,2),
  (10,89), (11,81), (12,96), (13,59), (14,38), (15,68), (16,39), (17,62),
  (18,91), (19,46), (20,6), (21,99), (22,97), (23,27), (24,46), (25,78),
  (26,54), (27,97), (28,8), (29,67), (30,29), (31,93), (32,84), (33,77),
  (34,23), (35,16), (36,16), (37,93), (38,65), (39,35), (40,47), (41,7),
  (42,86), (43,74), (44,61), (45,91), (46,85), (47,24), (48,85), (49,43),
  (50,59), (51,12), (52,32), (53,56), (54,3), (55,91), (56,22), (57,90),
  (58,55), (59,15), (60,28), (61,89), (62,25), (63,47), (64,1), (65,56),
  (66,40), (67,43), (68,56), (69,16), (70,75), (71,36), (72,89), (73,98),
  (74,76), (75,81), (76,4), (77,94), (78,42), (79,30), (80,78), (81,33),
  (82,29), (83,53), (84,63), (85,2), (86,87), (87,37), (88,80), (89,84),
  (90,72), (91,41), (92,9), (93,61), (94,73), (95,95), (96,65), (97,13),
  (98,58), (99,96), (100,98), (101,1), (102,21), (103,74), (104,65), (105,35),
  (106,5), (107,73), (108,11), (109,51), (110,87), (111,41), (112,12), (113,8),
  (114,20), (115,31), (116,31), (117,15), (118,95), (119,22), (120,73), 
  (121,79), (122,88), (123,34), (124,8), (125,11), (126,49), (127,34), 
  (128,90), (129,59), (130,96), (131,60), (132,55), (133,75), (134,77),
  (135,44), (136,2), (137,7), (138,85), (139,57), (140,74), (141,29), (142,70),
  (143,59), (144,19), (145,39), (146,26), (147,26), (148,47), (149,80),
  (150,90), (151,36), (152,58), (153,47), (154,9), (155,72), (156,72), (157,66),
  (158,33), (159,93), (160,75), (161,64), (162,81), (163,9), (164,23), (165,37),
  (166,13), (167,12), (168,14), (169,62), (170,91), (171,36), (172,91),
  (173,33), (174,15), (175,34), (176,36), (177,99), (178,3), (179,95), (180,69),
  (181,58), (182,52), (183,30), (184,50), (185,84), (186,10), (187,84),
  (188,33), (189,21), (190,39), (191,44), (192,58), (193,30), (194,38),
  (195,34), (196,83), (197,27), (198,82), (199,17), (200,7);
}

execsql_test 4.1 {
  SELECT a, sum(b) OVER (
    PARTITION BY (b%10)
    ORDER BY b
  ) FROM t2 ORDER BY a;
}

execsql_test 4.2 {
  SELECT a, sum(b) OVER (
    PARTITION BY (b%10)
    ORDER BY b
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) FROM t2 ORDER BY a;
}

execsql_test 4.3 {
  SELECT b, sum(b) OVER (
    ORDER BY b
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) FROM t2 ORDER BY b;
}

execsql_test 4.4 {
  SELECT b, sum(b) OVER (
    ORDER BY b
    RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY b;
}

execsql_test 4.5 {
  SELECT b, sum(b) OVER (
    ORDER BY b
    RANGE BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t2 ORDER BY b;
}

execsql_test 4.6.1 {
  SELECT b, sum(b) OVER (
    RANGE BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t2 ORDER BY b;
}
execsql_test 4.6.2 {
  SELECT b, sum(b) OVER () FROM t2 ORDER BY b;
}
execsql_test 4.6.3 {
  SELECT b, sum(b) OVER (
    RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY b;
}
execsql_test 4.6.4 {
  SELECT b, sum(b) OVER (
    RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY b;
}

execsql_test 4.7.1 {
  SELECT b, sum(b) OVER (
    ROWS BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t2 ORDER BY 1, 2;
}
execsql_test 4.7.2 {
  SELECT b, sum(b) OVER (
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) FROM t2 ORDER BY 1, 2;
}
execsql_test 4.7.3 {
  SELECT b, sum(b) OVER (
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY 1, 2;
}
execsql_test 4.7.4 {
  SELECT b, sum(b) OVER (
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY 1, 2;
}

execsql_test 4.8.1 {
  SELECT b, sum(b) OVER (
    ORDER BY a
    ROWS BETWEEN CURRENT ROW AND CURRENT ROW
  ) FROM t2 ORDER BY 1, 2;
}
execsql_test 4.8.2 {
  SELECT b, sum(b) OVER (
    ORDER BY a
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) FROM t2 ORDER BY 1, 2;
}
execsql_test 4.8.3 {
  SELECT b, sum(b) OVER (
    ORDER BY a
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY 1, 2;
}
execsql_test 4.8.4 {
  SELECT b, sum(b) OVER (
    ORDER BY a
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
  ) FROM t2 ORDER BY 1, 2;
}

execsql_float_test 4.9 {
  SELECT 
    rank() OVER win AS rank,
    cume_dist() OVER win AS cume_dist FROM t1
  WINDOW win AS (ORDER BY 1);
}

execsql_test 4.10 {
  SELECT count(*) OVER (ORDER BY b) FROM t1
}

execsql_test 4.11 {
  SELECT count(distinct a) FILTER (WHERE b='odd') FROM t1
}

==========

execsql_test 5.0 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(x INTEGER, y INTEGER);
  INSERT INTO t1 VALUES(10, 1);
  INSERT INTO t1 VALUES(20, 2);
  INSERT INTO t1 VALUES(3, 3);
  INSERT INTO t1 VALUES(2, 4);
  INSERT INTO t1 VALUES(1, 5);
}

execsql_float_test 5.1 {
  SELECT avg(x) OVER (ORDER BY y) AS z FROM t1 ORDER BY z;
}

==========

execsql_test 6.0 {
  DROP TABLE IF EXISTS t0;
  CREATE TABLE t0(c0 INTEGER UNIQUE);
  INSERT INTO t0 VALUES(0);
}
execsql_test 6.1 {
  SELECT DENSE_RANK() OVER(), LAG(0) OVER() FROM t0;
}
execsql_test 6.2 {
  SELECT * FROM t0 WHERE 
      (0, t0.c0) IN (SELECT DENSE_RANK() OVER(), LAG(0) OVER() FROM t0);
} 

==========

execsql_test 7.0 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER, b INTEGER, c INTEGER);
  INSERT INTO t1 VALUES(1, 1, 1);
  INSERT INTO t1 VALUES(1, 2, 2);
  INSERT INTO t1 VALUES(3, 3, 3);
  INSERT INTO t1 VALUES(3, 4, 4);
}

execsql_test 7.1 {
  SELECT c, sum(c) OVER win1 FROM t1 
  WINDOW win1 AS (ORDER BY b)
}

execsql_test 7.2 {
  SELECT c, sum(c) OVER win1 FROM t1 
  WINDOW win1 AS (PARTITION BY 1 ORDER BY b)
}

execsql_test 7.3 {
  SELECT c, sum(c) OVER win1 FROM t1 
  WINDOW win1 AS (ORDER BY 1)
}

finish_test


