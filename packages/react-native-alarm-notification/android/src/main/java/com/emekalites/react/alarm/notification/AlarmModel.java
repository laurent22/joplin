package com.emekalites.react.alarm.notification;

import android.os.Bundle;

import androidx.annotation.NonNull;

import java.io.Serializable;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;

public class AlarmModel implements Serializable {
    private int id;

    private int minute;
    private int hour;
    private int second;

    private int day;
    private int month;
    private int year;

    private int alarmId;
    private String title;
    private String message;
    private String channel;
    private String ticker;
    private boolean autoCancel;
    private boolean vibrate;
    private int vibration;
    private String smallIcon;
    private String largeIcon;
    private boolean playSound;
    private String soundName;
    private String soundNames; // separate sounds with comma eg (sound1.mp3,sound2.mp3)
    private String color;
    private String scheduleType;
    private String interval; // hourly, daily, weekly
    private int intervalValue;
    private int snoozeInterval;                       // in minutes
    private String tag;
    private Bundle data;
    private boolean loopSound;
    private boolean useBigText;
    private boolean hasButton;
    private double volume;
    private boolean bypassDnd;

    private int active = 1;         // 1 = yes, 0 = no

    private AlarmModel() {}

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getSecond() {
        return second;
    }

    public void setSecond(int second) {
        this.second = second;
    }

    public int getMinute() {
        return minute;
    }

    public void setMinute(int minute) {
        this.minute = minute;
    }

    public int getHour() {
        return hour;
    }

    public void setHour(int hour) {
        this.hour = hour;
    }

    public int getDay() {
        return day;
    }

    public void setDay(int day) {
        this.day = day;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getAlarmId() {
        return alarmId;
    }

    public void setAlarmId(int alarmId) {
        this.alarmId = alarmId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public boolean isAutoCancel() {
        return autoCancel;
    }

    public void setAutoCancel(boolean autoCancel) {
        this.autoCancel = autoCancel;
    }

    public boolean isVibrate() {
        return vibrate;
    }

    public void setVibrate(boolean vibrate) {
        this.vibrate = vibrate;
    }

    public int getVibration() {
        return vibration;
    }

    public void setVibration(int vibration) {
        this.vibration = vibration;
    }

    public String getSmallIcon() {
        return smallIcon;
    }

    public void setSmallIcon(String smallIcon) {
        this.smallIcon = smallIcon;
    }

    public String getLargeIcon() {
        return largeIcon;
    }

    public void setLargeIcon(String largeIcon) {
        this.largeIcon = largeIcon;
    }

    public boolean isPlaySound() {
        return playSound;
    }

    public void setPlaySound(boolean playSound) {
        this.playSound = playSound;
    }

    public String getSoundName() {
        return soundName;
    }

    public void setSoundName(String soundName) {
        this.soundName = soundName;
    }

    public String getSoundNames() {
        return soundNames;
    }

    public void setSoundNames(String soundNames) {
        this.soundNames = soundNames;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getScheduleType() {
        return scheduleType;
    }

    public void setScheduleType(String scheduleType) {
        this.scheduleType = scheduleType;
    }

    public String getInterval() {
        return interval;
    }

    public void setInterval(String interval) {
        this.interval = interval;
    }

    public int getIntervalValue() {
        return intervalValue;
    }

    public void setIntervalValue(int intervalValue) {
        this.intervalValue = intervalValue;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public Bundle getData() {
        return data;
    }

    public void setData(Bundle data) {
        this.data = data;
    }

    public int getActive() {
        return active;
    }

    public void setActive(int active) {
        this.active = active;
    }

    public int getSnoozeInterval() {
        return snoozeInterval;
    }

    public void setSnoozeInterval(int snoozeInterval) {
        this.snoozeInterval = snoozeInterval;
    }

    public boolean isLoopSound() {
        return loopSound;
    }

    public void setLoopSound(boolean loopSound) {
        this.loopSound = loopSound;
    }

    public boolean isUseBigText() {
        return useBigText;
    }

    public void setUseBigText(boolean useBigText) {
        this.useBigText = useBigText;
    }

    public boolean isHasButton() {
        return hasButton;
    }

    public void setHasButton(boolean hasButton) {
        this.hasButton = hasButton;
    }

    public double getVolume() {
        return volume;
    }

    public void setVolume(double volume) {
        if (volume > 1 || volume < 0) {
            this.volume = 0.5;
        } else {
            this.volume = volume;
        }
    }

    public boolean isBypassDnd() {
        return bypassDnd;
    }

    public void setBypassDnd(boolean bypassDnd) {
        this.bypassDnd = bypassDnd;
    }

    @NonNull
    @Override
    public String toString() {
        return "AlarmModel{" +
                "id=" + id +
                ", second=" + second +
                ", minute=" + minute +
                ", hour=" + hour +
                ", day=" + day +
                ", month=" + month +
                ", year=" + year +
                ", alarmId=" + alarmId +
                ", title='" + title + '\'' +
                ", message='" + message + '\'' +
                ", channel='" + channel + '\'' +
                ", ticker='" + ticker + '\'' +
                ", autoCancel=" + autoCancel +
                ", vibrate=" + vibrate +
                ", vibration=" + vibration +
                ", smallIcon='" + smallIcon + '\'' +
                ", largeIcon='" + largeIcon + '\'' +
                ", playSound=" + playSound +
                ", soundName='" + soundName + '\'' +
                ", soundNames='" + soundNames + '\'' +
                ", color='" + color + '\'' +
                ", scheduleType='" + scheduleType + '\'' +
                ", interval=" + interval +
                ", intervalValue=" + intervalValue +
                ", snoozeInterval=" + snoozeInterval +
                ", tag='" + tag + '\'' +
                ", data='" + data + '\'' +
                ", loopSound=" + loopSound +
                ", useBigText=" + useBigText +
                ", hasButton=" + hasButton +
                ", volume=" + volume +
                ", bypassDnd=" + bypassDnd +
                ", active=" + active +
                '}';
    }

    public static AlarmModel fromBundle(@NonNull Bundle bundle) {
        AlarmModel alarm = new AlarmModel();

        long time = System.currentTimeMillis() / 1000;
        alarm.setAlarmId((int) time);

        alarm.setActive(1);
        alarm.setAutoCancel(bundle.getBoolean("auto_cancel", true));
        alarm.setChannel(bundle.getString("channel", "my_channel_id"));
        alarm.setColor(bundle.getString("color", ""));

        Bundle data = bundle.getBundle("data");
        alarm.setData(data);

        alarm.setInterval(bundle.getString("repeat_interval", "hourly"));
        alarm.setLargeIcon(bundle.getString("large_icon", ""));
        alarm.setLoopSound(bundle.getBoolean("loop_sound", false));
        alarm.setMessage(bundle.getString("message", "My Notification Message"));
        alarm.setPlaySound(bundle.getBoolean("play_sound", true));
        alarm.setScheduleType(bundle.getString("schedule_type", "once"));
        alarm.setSmallIcon(bundle.getString("small_icon", "ic_notification"));
        alarm.setSnoozeInterval((int) bundle.getDouble("snooze_interval", 1.0));
        alarm.setSoundName(bundle.getString("sound_name", null));
        alarm.setSoundNames(bundle.getString("sound_names", null));
        alarm.setTag(bundle.getString("tag", ""));
        alarm.setTicker(bundle.getString("ticker", ""));
        alarm.setTitle(bundle.getString("title", "My Notification Title"));
        alarm.setVibrate(bundle.getBoolean("vibrate", true));
        alarm.setHasButton(bundle.getBoolean("has_button", false));
        alarm.setVibration((int) bundle.getDouble("vibration", 100.0));
        alarm.setUseBigText(bundle.getBoolean("use_big_text", false));
        alarm.setVolume(bundle.getDouble("volume", 0.5));
        alarm.setIntervalValue((int) bundle.getDouble("interval_value", 1));
        alarm.setBypassDnd(bundle.getBoolean("bypass_dnd", false));

        String datetime = bundle.getString("fire_date");
        SimpleDateFormat sdf = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss", Locale.ENGLISH);
        Calendar calendar = new GregorianCalendar();

        try {
            calendar.setTime(sdf.parse(datetime));
        } catch (ParseException e) {
            throw new RuntimeException(e);
        }

        alarm.setAlarmDateTime(calendar);
        return alarm;
    }

    void setAlarmDateTime(Calendar calendar) {
        setSecond(calendar.get(Calendar.SECOND));
        setMinute(calendar.get(Calendar.MINUTE));
        setHour(calendar.get(Calendar.HOUR_OF_DAY));
        setDay(calendar.get(Calendar.DAY_OF_MONTH));
        setMonth(calendar.get(Calendar.MONTH) + 1);
        setYear(calendar.get(Calendar.YEAR));
    }

    Calendar getAlarmDateTime() {
        Calendar calendar = new GregorianCalendar();
        calendar.set(Calendar.HOUR_OF_DAY, getHour());
        calendar.set(Calendar.MINUTE, getMinute());
        calendar.set(Calendar.SECOND, getSecond());
        calendar.set(Calendar.DAY_OF_MONTH, getDay());
        calendar.set(Calendar.MONTH, getMonth() - 1);
        calendar.set(Calendar.YEAR, getYear());
        return calendar;
    }

    Calendar snooze() {
        Calendar calendar = getAlarmDateTime();
        calendar.add(Calendar.MINUTE, getSnoozeInterval());
        setAlarmDateTime(calendar);
        return calendar;
    }
    
    boolean isSameTime(AlarmModel alarm) {
        return this.getHour() == alarm.getHour() && this.getMinute() == alarm.getMinute() &&
                this.getSecond() == alarm.getSecond() && this.getDay() == alarm.getDay() &&
                this.getMonth() == alarm.getMonth() && this.getYear() == alarm.getYear();
    }
}
