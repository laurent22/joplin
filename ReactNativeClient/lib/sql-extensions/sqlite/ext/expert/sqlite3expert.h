/*
** 2017 April 07
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
*/
#if !defined(SQLITEEXPERT_H)
#define SQLITEEXPERT_H 1
#include "sqlite3.h"

typedef struct sqlite3expert sqlite3expert;

/*
** Create a new sqlite3expert object.
**
** If successful, a pointer to the new object is returned and (*pzErr) set
** to NULL. Or, if an error occurs, NULL is returned and (*pzErr) set to
** an English-language error message. In this case it is the responsibility
** of the caller to eventually free the error message buffer using
** sqlite3_free().
*/
sqlite3expert *sqlite3_expert_new(sqlite3 *db, char **pzErr);

/*
** Configure an sqlite3expert object.
**
** EXPERT_CONFIG_SAMPLE:
**   By default, sqlite3_expert_analyze() generates sqlite_stat1 data for
**   each candidate index. This involves scanning and sorting the entire
**   contents of each user database table once for each candidate index
**   associated with the table. For large databases, this can be 
**   prohibitively slow. This option allows the sqlite3expert object to
**   be configured so that sqlite_stat1 data is instead generated based on a
**   subset of each table, or so that no sqlite_stat1 data is used at all.
**
**   A single integer argument is passed to this option. If the value is less
**   than or equal to zero, then no sqlite_stat1 data is generated or used by
**   the analysis - indexes are recommended based on the database schema only.
**   Or, if the value is 100 or greater, complete sqlite_stat1 data is
**   generated for each candidate index (this is the default). Finally, if the
**   value falls between 0 and 100, then it represents the percentage of user
**   table rows that should be considered when generating sqlite_stat1 data.
**
**   Examples:
**
**     // Do not generate any sqlite_stat1 data
**     sqlite3_expert_config(pExpert, EXPERT_CONFIG_SAMPLE, 0);
**
**     // Generate sqlite_stat1 data based on 10% of the rows in each table.
**     sqlite3_expert_config(pExpert, EXPERT_CONFIG_SAMPLE, 10);
*/
int sqlite3_expert_config(sqlite3expert *p, int op, ...);

#define EXPERT_CONFIG_SAMPLE 1    /* int */

/*
** Specify zero or more SQL statements to be included in the analysis.
**
** Buffer zSql must contain zero or more complete SQL statements. This
** function parses all statements contained in the buffer and adds them
** to the internal list of statements to analyze. If successful, SQLITE_OK
** is returned and (*pzErr) set to NULL. Or, if an error occurs - for example
** due to a error in the SQL - an SQLite error code is returned and (*pzErr)
** may be set to point to an English language error message. In this case
** the caller is responsible for eventually freeing the error message buffer
** using sqlite3_free().
**
** If an error does occur while processing one of the statements in the
** buffer passed as the second argument, none of the statements in the
** buffer are added to the analysis.
**
** This function must be called before sqlite3_expert_analyze(). If a call
** to this function is made on an sqlite3expert object that has already
** been passed to sqlite3_expert_analyze() SQLITE_MISUSE is returned
** immediately and no statements are added to the analysis.
*/
int sqlite3_expert_sql(
  sqlite3expert *p,               /* From a successful sqlite3_expert_new() */
  const char *zSql,               /* SQL statement(s) to add */
  char **pzErr                    /* OUT: Error message (if any) */
);


/*
** This function is called after the sqlite3expert object has been configured
** with all SQL statements using sqlite3_expert_sql() to actually perform
** the analysis. Once this function has been called, it is not possible to
** add further SQL statements to the analysis.
**
** If successful, SQLITE_OK is returned and (*pzErr) is set to NULL. Or, if
** an error occurs, an SQLite error code is returned and (*pzErr) set to 
** point to a buffer containing an English language error message. In this
** case it is the responsibility of the caller to eventually free the buffer
** using sqlite3_free().
**
** If an error does occur within this function, the sqlite3expert object
** is no longer useful for any purpose. At that point it is no longer
** possible to add further SQL statements to the object or to re-attempt
** the analysis. The sqlite3expert object must still be freed using a call
** sqlite3_expert_destroy().
*/
int sqlite3_expert_analyze(sqlite3expert *p, char **pzErr);

/*
** Return the total number of statements loaded using sqlite3_expert_sql().
** The total number of SQL statements may be different from the total number
** to calls to sqlite3_expert_sql().
*/
int sqlite3_expert_count(sqlite3expert*);

/*
** Return a component of the report.
**
** This function is called after sqlite3_expert_analyze() to extract the
** results of the analysis. Each call to this function returns either a
** NULL pointer or a pointer to a buffer containing a nul-terminated string.
** The value passed as the third argument must be one of the EXPERT_REPORT_*
** #define constants defined below.
**
** For some EXPERT_REPORT_* parameters, the buffer returned contains 
** information relating to a specific SQL statement. In these cases that
** SQL statement is identified by the value passed as the second argument.
** SQL statements are numbered from 0 in the order in which they are parsed.
** If an out-of-range value (less than zero or equal to or greater than the
** value returned by sqlite3_expert_count()) is passed as the second argument
** along with such an EXPERT_REPORT_* parameter, NULL is always returned.
**
** EXPERT_REPORT_SQL:
**   Return the text of SQL statement iStmt.
**
** EXPERT_REPORT_INDEXES:
**   Return a buffer containing the CREATE INDEX statements for all recommended
**   indexes for statement iStmt. If there are no new recommeded indexes, NULL 
**   is returned.
**
** EXPERT_REPORT_PLAN:
**   Return a buffer containing the EXPLAIN QUERY PLAN output for SQL query
**   iStmt after the proposed indexes have been added to the database schema.
**
** EXPERT_REPORT_CANDIDATES:
**   Return a pointer to a buffer containing the CREATE INDEX statements 
**   for all indexes that were tested (for all SQL statements). The iStmt
**   parameter is ignored for EXPERT_REPORT_CANDIDATES calls.
*/
const char *sqlite3_expert_report(sqlite3expert*, int iStmt, int eReport);

/*
** Values for the third argument passed to sqlite3_expert_report().
*/
#define EXPERT_REPORT_SQL        1
#define EXPERT_REPORT_INDEXES    2
#define EXPERT_REPORT_PLAN       3
#define EXPERT_REPORT_CANDIDATES 4

/*
** Free an (sqlite3expert*) handle and all associated resources. There 
** should be one call to this function for each successful call to 
** sqlite3-expert_new().
*/
void sqlite3_expert_destroy(sqlite3expert*);

#endif  /* !defined(SQLITEEXPERT_H) */
