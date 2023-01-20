package com.emekalites.react.alarm.notification;

import android.os.Bundle;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class AlarmModelTest {

    @Test
    public void testToJson() {
        Bundle bundle = new Bundle();
        bundle.putString("title", "alarm title");
        bundle.putString("fire_date", "2021-11-27 13:48:00");

        Bundle data = new Bundle();
        data.putString("string_data_key", "string_data_value");
        data.putInt("int_data_key", 42);

        bundle.putBundle("data", data);

        AlarmModel alarm = AlarmModel.fromBundle(bundle);

        AlarmModelCodec codec = new AlarmModelCodec();

        String json = codec.toJson(alarm);
        System.out.println(json);
        System.out.println(codec.fromJson(json));
    }

}