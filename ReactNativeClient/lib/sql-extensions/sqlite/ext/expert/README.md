## SQLite Expert Extension

This folder contains code for a simple system to propose useful indexes
given a database and a set of SQL queries. It works as follows:

  1. The user database schema is copied to a temporary database.

  1. All SQL queries are prepared against the temporary database.
     Information regarding the WHERE and ORDER BY clauses, and other query
     features that affect index selection are recorded.

  1. The information gathered in step 2 is used to create candidate 
     indexes - indexes that the planner might have made use of in the previous
     step, had they been available.

  1. A subset of the data in the user database is used to generate statistics
     for all existing indexes and the candidate indexes generated in step 3
     above.

  1. The SQL queries are prepared a second time. If the planner uses any
     of the indexes created in step 3, they are recommended to the user.

# C API

The SQLite expert C API is defined in sqlite3expert.h. Most uses will proceed
as follows:

  1. An sqlite3expert object is created by calling **sqlite3\_expert\_new()**.
     A database handle opened by the user is passed as an argument.

  1. The sqlite3expert object is configured with one or more SQL statements
     by making one or more calls to **sqlite3\_expert\_sql()**. Each call may
     specify a single SQL statement, or multiple statements separated by
     semi-colons.
  
  1. Optionally, the **sqlite3\_expert\_config()** API may be used to 
     configure the size of the data subset used to generate index statistics.
     Using a smaller subset of the data can speed up the analysis.

  1. **sqlite3\_expert\_analyze()** is called to run the analysis.

  1. One or more calls are made to **sqlite3\_expert\_report()** to extract
     components of the results of the analysis.

  1. **sqlite3\_expert\_destroy()** is called to free all resources.

Refer to comments in sqlite3expert.h for further details.

# sqlite3_expert application

The file "expert.c" contains the code for a command line application that
uses the API described above. It can be compiled with (for example):

<pre>
  gcc -O2 sqlite3.c expert.c sqlite3expert.c -o sqlite3_expert
</pre>

Assuming the database is named "test.db", it can then be run to analyze a
single query:

<pre>
  ./sqlite3_expert -sql &lt;sql-query&gt; test.db
</pre>

Or an entire text file worth of queries with:

<pre>
  ./sqlite3_expert -file &lt;text-file&gt; test.db
</pre>

By default, sqlite3\_expert generates index statistics using all the data in
the user database. For a large database, this may be prohibitively time
consuming. The "-sample" option may be used to configure sqlite3\_expert to
generate statistics based on an integer percentage of the user database as
follows:

<pre>
  # Generate statistics based on 25% of the user database rows:
  ./sqlite3_expert -sample 25 -sql &lt;sql-query&gt; test.db

  # Do not generate any statistics at all:
  ./sqlite3_expert -sample 0 -sql &lt;sql-query&gt; test.db
</pre>
