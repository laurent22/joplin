package com.emekalites.react.alarm.notification;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import java.util.ArrayList;

public class AlarmDatabase extends SQLiteOpenHelper implements AutoCloseable {

    private static final int DATABASE_VERSION = 1;
    private static final String DATABASE_NAME = "rnandb";

    private static final String TABLE_NAME = "alarmtbl";

    private static final String COL_ID = "id";
    private static final String COL_DATA = "gson_data";
    private static final String COL_ACTIVE = "active";

    private final String CREATE_TABLE_ALARM = "CREATE TABLE " + TABLE_NAME + " ("
            + COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
            + COL_DATA + " TEXT, "
            + COL_ACTIVE + " INTEGER) ";

    private final AlarmModelCodec codec = new AlarmModelCodec();

    AlarmDatabase(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(CREATE_TABLE_ALARM);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL(String.format(" DROP TABLE IF EXISTS %s", CREATE_TABLE_ALARM));
        onCreate(db);
    }

    AlarmModel getAlarm(int _id) {
        SQLiteDatabase db = this.getWritableDatabase();
        AlarmModel alarm = null;

        String selectQuery = "SELECT * FROM " + TABLE_NAME + " WHERE " + COL_ID + " = " + _id;

        try (Cursor cursor = db.rawQuery(selectQuery, null)) {
            cursor.moveToFirst();

            int id = cursor.getInt(0);
            String data = cursor.getString(1);
            int active = cursor.getInt(2);

            Log.d(Constants.TAG, "get alarm -> id:" + id + ", active:" + active + ", " + data);


            alarm = codec.fromJson(data);
            alarm.setId(id);
            alarm.setActive(active);
        } catch (Exception e) {
            Log.e(Constants.TAG, "getAlarm: exception", e);
        }

        return alarm;
    }

    int insert(AlarmModel alarm) {

        try (SQLiteDatabase db = this.getWritableDatabase()) {
            ContentValues values = new ContentValues();

            String data = codec.toJson(alarm);
            Log.i(Constants.TAG, "insert alarm: " + data);

            values.put(COL_DATA, data);
            values.put(COL_ACTIVE, alarm.getActive());

            return (int) db.insert(TABLE_NAME, null, values);
        } catch (Exception e) {
            Log.e(Constants.TAG, "Error inserting into DB", e);
            return 0;
        }
    }

    void update(AlarmModel alarm) {
        String where = COL_ID + " = " + alarm.getId();
        try (SQLiteDatabase db = this.getWritableDatabase()) {
            ContentValues values = new ContentValues();

            String data = codec.toJson(alarm);
            Log.d(Constants.TAG, "update alarm: " + data);

            values.put(COL_ID, alarm.getId());
            values.put(COL_DATA, data);
            values.put(COL_ACTIVE, alarm.getActive());

            db.update(TABLE_NAME, values, where, null);

        } catch (Exception e) {
            Log.e(Constants.TAG, "Error updating alarm " + alarm, e);
        }
    }

    void delete(int id) {
        String where = COL_ID + "=" + id;
        try (SQLiteDatabase db = this.getWritableDatabase()) {
            db.delete(TABLE_NAME, where, null);
        } catch (Exception e) {
            Log.e(Constants.TAG, "Error deleting alarm with id " + id, e);
        }
    }

    ArrayList<AlarmModel> getAlarmList(int isActive) {
        String selectQuery = "SELECT * FROM " + TABLE_NAME;

        if (isActive == 1) {
            selectQuery += " WHERE " + COL_ACTIVE + " = " + isActive;
        }

        SQLiteDatabase db = this.getWritableDatabase();
        ArrayList<AlarmModel> alarms = new ArrayList<>();

        try (Cursor cursor = db.rawQuery(selectQuery, null)) {
            if (cursor.moveToFirst()) {
                do {
                    int id = cursor.getInt(0);
                    String data = cursor.getString(1);
                    int active = cursor.getInt(2);

                    Log.d(Constants.TAG, "get alarm -> id:" + id + ", active:" + active + ", " + data);

                    AlarmModel alarm = codec.fromJson(data);
                    alarm.setId(id);
                    alarm.setActive(active);

                    alarms.add(alarm);
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            Log.e(Constants.TAG, "getAlarmList: exception cause " + e.getCause() + " message " + e.getMessage());
        }

        return alarms;
    }

    ArrayList<AlarmModel> getAlarmList() {
        return getAlarmList(0);
    }
}
