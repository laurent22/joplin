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

start_test window3 "2018 May 31"
ifcapable !windowfunc

execsql_test 1.0 {
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b INTEGER);
  INSERT INTO t2(a, b) VALUES
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

execsql_test 1.1 {
  SELECT max(b) OVER (
    ORDER BY a
  ) FROM t2
}

foreach {tn window} {
   1 "RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"
   2 "RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING"
   3 "RANGE BETWEEN CURRENT ROW         AND CURRENT ROW"
   4 "RANGE BETWEEN CURRENT ROW         AND UNBOUNDED FOLLOWING"
   5 "ROWS BETWEEN UNBOUNDED PRECEDING AND 4 PRECEDING"
   6 "ROWS BETWEEN 4 PRECEDING    AND 2 PRECEDING"
   7 "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"
   8 "ROWS BETWEEN 4 PRECEDING    AND CURRENT ROW"
   9 "ROWS BETWEEN CURRENT ROW         AND CURRENT ROW"
  10 "ROWS BETWEEN UNBOUNDED PRECEDING AND 4 FOLLOWING"
  11 "ROWS BETWEEN 4 PRECEDING    AND 2 FOLLOWING"
  12 "ROWS BETWEEN CURRENT ROW         AND 4 FOLLOWING"
  13 "ROWS BETWEEN 2 FOLLOWING    AND 4 FOLLOWING"
  14 "ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING"
  15 "ROWS BETWEEN 4 PRECEDING    AND UNBOUNDED FOLLOWING"
  16 "ROWS BETWEEN CURRENT ROW         AND UNBOUNDED FOLLOWING"
  17 "ROWS BETWEEN 4 FOLLOWING    AND UNBOUNDED FOLLOWING"

  18 "ROWS BETWEEN 4 PRECEDING    AND UNBOUNDED FOLLOWING EXCLUDE CURRENT ROW"
  19 "ROWS BETWEEN 4 PRECEDING    AND UNBOUNDED FOLLOWING EXCLUDE TIES"
  20 "ROWS BETWEEN 4 PRECEDING    AND UNBOUNDED FOLLOWING EXCLUDE GROUP"

} {
  execsql_test 1.$tn.2.1 "SELECT max(b) OVER ( ORDER BY a $window ) FROM t2"
  execsql_test 1.$tn.2.2 "SELECT min(b) OVER ( ORDER BY a $window ) FROM t2"

  execsql_test 1.$tn.3.1 "
    SELECT row_number() OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.3.2 "
    SELECT row_number() OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.3.3 "
    SELECT row_number() OVER ( $window ) FROM t2
  "

  execsql_test 1.$tn.4.1 "
    SELECT dense_rank() OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.4.2 "
    SELECT dense_rank() OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.4.3 "
    SELECT dense_rank() OVER ( ORDER BY b $window ) FROM t2
  "
  execsql_test 1.$tn.4.4 "
    SELECT dense_rank() OVER ( PARTITION BY b%10 ORDER BY b $window ) FROM t2
  "
  execsql_test 1.$tn.4.5 "
    SELECT dense_rank() OVER ( ORDER BY b%10 $window ) FROM t2
  "
  execsql_test 1.$tn.4.6 "
    SELECT dense_rank() OVER ( PARTITION BY b%2 ORDER BY b%10 $window ) FROM t2
  "

  execsql_test 1.$tn.5.1 "
    SELECT rank() OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.5.2 "
    SELECT rank() OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.5.3 "
    SELECT rank() OVER ( ORDER BY b $window ) FROM t2
  "
  execsql_test 1.$tn.5.4 "
    SELECT rank() OVER ( PARTITION BY b%10 ORDER BY b $window ) FROM t2
  "
  execsql_test 1.$tn.5.5 "
    SELECT rank() OVER ( ORDER BY b%10 $window ) FROM t2
  "
  execsql_test 1.$tn.5.6 "
    SELECT rank() OVER ( PARTITION BY b%2 ORDER BY b%10 $window ) FROM t2
  "

  execsql_test 1.$tn.6.1 "
    SELECT 
      row_number() OVER ( PARTITION BY b%2 ORDER BY b%10 $window ),
      rank() OVER ( PARTITION BY b%2 ORDER BY b%10 $window ),
      dense_rank() OVER ( PARTITION BY b%2 ORDER BY b%10 $window )
    FROM t2
  "

  execsql_float_test 1.$tn.7.1 "
    SELECT percent_rank() OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_float_test 1.$tn.7.2 "
    SELECT percent_rank() OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_float_test 1.$tn.7.3 "
    SELECT percent_rank() OVER ( ORDER BY b $window ) FROM t2
  "
  execsql_float_test 1.$tn.7.4 "
    SELECT percent_rank() OVER ( PARTITION BY b%10 ORDER BY b $window ) FROM t2
  "
  execsql_float_test 1.$tn.7.5 "
    SELECT percent_rank() OVER ( ORDER BY b%10 $window ) FROM t2
  "
  execsql_float_test 1.$tn.7.6 "
    SELECT percent_rank() OVER (PARTITION BY b%2 ORDER BY b%10 $window) FROM t2
  "

  execsql_float_test 1.$tn.8.1 "
    SELECT cume_dist() OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.2 "
    SELECT cume_dist() OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.3 "
    SELECT cume_dist() OVER ( ORDER BY b $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.4 "
    SELECT cume_dist() OVER ( PARTITION BY b%10 ORDER BY b $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.5 "
    SELECT cume_dist() OVER ( ORDER BY b%10 $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.6 "
    SELECT cume_dist() OVER ( PARTITION BY b%2 ORDER BY b%10 $window ) FROM t2
  "

  execsql_float_test 1.$tn.8.1 "
    SELECT ntile(100) OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.2 "
    SELECT ntile(101) OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.3 "
    SELECT ntile(102) OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.4 "
    SELECT ntile(103) OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.5 "
    SELECT ntile(104) OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_float_test 1.$tn.8.6 "
    SELECT ntile(105) OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "
  execsql_float_test 1.$tn.8.7 "
    SELECT ntile(105) OVER ( $window ) FROM t2
  "

  execsql_test 1.$tn.9.1 "
    SELECT last_value(a+b) OVER ( ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.9.2 "
    SELECT last_value(a+b) OVER ( PARTITION BY b%10 ORDER BY a $window ) FROM t2
  "
  execsql_test 1.$tn.9.3 "
    SELECT last_value(a+b) OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.9.4 "
    SELECT last_value(a+b) OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.9.5 "
    SELECT last_value(a+b) OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_test 1.$tn.9.6 "
    SELECT last_value(a+b) OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "

  execsql_test 1.$tn.10.1 "
    SELECT nth_value(b,b+1) OVER (ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.10.2 "
    SELECT nth_value(b,b+1) OVER (PARTITION BY b%10 ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.10.3 "
    SELECT nth_value(b,b+1) OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.10.4 "
    SELECT nth_value(b,b+1) OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.10.5 "
    SELECT nth_value(b,b+1) OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_test 1.$tn.10.6 "
    SELECT nth_value(b,b+1) OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "

  execsql_test 1.$tn.11.1 "
    SELECT first_value(b) OVER (ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.11.2 "
    SELECT first_value(b) OVER (PARTITION BY b%10 ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.11.3 "
    SELECT first_value(b) OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.11.4 "
    SELECT first_value(b) OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.11.5 "
    SELECT first_value(b) OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_test 1.$tn.11.6 "
    SELECT first_value(b) OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "

  execsql_test 1.$tn.12.1 "
    SELECT lead(b,b) OVER (ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.12.2 "
    SELECT lead(b,b) OVER (PARTITION BY b%10 ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.12.3 "
    SELECT lead(b,b) OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.12.4 "
    SELECT lead(b,b) OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.12.5 "
    SELECT lead(b,b) OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_test 1.$tn.12.6 "
    SELECT lead(b,b) OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "

  execsql_test 1.$tn.13.1 "
    SELECT lag(b,b) OVER (ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.13.2 "
    SELECT lag(b,b) OVER (PARTITION BY b%10 ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.13.3 "
    SELECT lag(b,b) OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.13.4 "
    SELECT lag(b,b) OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.13.5 "
    SELECT lag(b,b) OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_test 1.$tn.13.6 "
    SELECT lag(b,b) OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "

  execsql_test 1.$tn.14.1 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER (ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.14.2 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER (PARTITION BY b%10 ORDER BY a $window) FROM t2
  "
  execsql_test 1.$tn.14.3 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER ( ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.14.4 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER ( PARTITION BY b%10 ORDER BY b,a $window ) FROM t2
  "
  execsql_test 1.$tn.14.5 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER ( ORDER BY b%10,a $window ) FROM t2
  "
  execsql_test 1.$tn.14.6 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER (PARTITION BY b%2,a ORDER BY b%10 $window) FROM t2
  "

  execsql_test 1.$tn.14.7 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER (win1 ORDER BY b%10 $window) 
    FROM t2
    WINDOW win1 AS (PARTITION BY b%2,a)
    ORDER BY 1
  "

  execsql_test 1.$tn.14.8 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER (win1 $window) 
    FROM t2
    WINDOW win1 AS (PARTITION BY b%2,a ORDER BY b%10)
    ORDER BY 1
  "

  execsql_test 1.$tn.14.9 "
    SELECT string_agg(CAST(b AS TEXT), '.') OVER win2
    FROM t2
    WINDOW win1 AS (PARTITION BY b%2,a ORDER BY b%10),
           win2 AS (win1 $window)
    ORDER BY 1
  "

  execsql_test 1.$tn.15.1 "
    SELECT count(*) OVER win, string_agg(CAST(b AS TEXT), '.') 
    FILTER (WHERE a%2=0) OVER win FROM t2
    WINDOW win AS (ORDER BY a $window)
  "

  execsql_test 1.$tn.15.2 "
    SELECT count(*) OVER win, string_agg(CAST(b AS TEXT), '.') 
    FILTER (WHERE 0=1) OVER win FROM t2
    WINDOW win AS (ORDER BY a $window)
  "

  execsql_test 1.$tn.15.3 "
    SELECT count(*) OVER win, string_agg(CAST(b AS TEXT), '.') 
    FILTER (WHERE 1=0) OVER win FROM t2
    WINDOW win AS (PARTITION BY (a%10) ORDER BY a $window)
  "

  execsql_test 1.$tn.15.4 "
    SELECT count(*) OVER win, string_agg(CAST(b AS TEXT), '.') 
    FILTER (WHERE a%2=0) OVER win FROM t2
    WINDOW win AS (PARTITION BY (a%10) ORDER BY a $window)
  "

}

finish_test

