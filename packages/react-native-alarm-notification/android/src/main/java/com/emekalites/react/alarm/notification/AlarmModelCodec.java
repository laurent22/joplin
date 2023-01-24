package com.emekalites.react.alarm.notification;

import static com.google.gson.stream.JsonToken.END_OBJECT;

import android.os.Bundle;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.TypeAdapter;
import com.google.gson.TypeAdapterFactory;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;

import java.io.IOException;

public class AlarmModelCodec {

    private final Gson gson = new GsonBuilder()
            .registerTypeAdapterFactory(new TypeAdapterFactory() {

                @Override
                public <T> TypeAdapter<T> create(final Gson gson, TypeToken<T> typeToken) {
                    if (!Bundle.class.isAssignableFrom(typeToken.getRawType())) {
                        return null;
                    }
                    return (TypeAdapter<T>) new TypeAdapter<Bundle>() {
                        @Override
                        public void write(JsonWriter writer, Bundle bundle) throws IOException {
                            if (bundle == null) {
                                writer.nullValue();
                                return;
                            }
                            writer.beginObject();
                            for (String key : bundle.keySet()) {
                                writer.name(key);
                                Object value = bundle.get(key);
                                if (value == null) {
                                    writer.nullValue();
                                } else {
                                    gson.toJson(value, value.getClass(), writer);
                                }
                            }
                            writer.endObject();
                        }

                        @Override
                        public Bundle read(JsonReader reader) throws IOException {
                            switch (reader.peek()) {
                                case NULL:
                                    reader.nextNull();
                                    return null;
                                case BEGIN_OBJECT:
                                    return readBundle(reader);
                                default:
                                    throw new IOException("Could not read bundle at " + reader.getPath());
                            }
                        }

                        private Bundle readBundle(JsonReader reader) throws IOException {
                            reader.beginObject();
                            Bundle bundle = new Bundle();
                            JsonToken nextToken;
                            while ((nextToken = reader.peek()) != END_OBJECT) {
                                switch (nextToken) {
                                    case NAME:
                                        readNextKeyValue(reader, bundle);
                                    case END_OBJECT:
                                        break;
                                }
                            }
                            reader.endObject();
                            return bundle;
                        }

                        private void readNextKeyValue(JsonReader reader, Bundle bundle) throws IOException {
                            String name = reader.nextName();
                            // only support a small subset of possible types, enough for Joplin
                            switch (reader.peek()) {
                                case STRING:
                                    bundle.putString(name, reader.nextString());
                                    break;
                                case BOOLEAN:
                                    bundle.putBoolean(name, reader.nextBoolean());
                                case NUMBER:
                                    double doubleVal = reader.nextDouble();
                                    if (Math.round(doubleVal) == doubleVal) {
                                        long longVal = (long) doubleVal;
                                        if (longVal >= Integer.MIN_VALUE && longVal <= Integer.MAX_VALUE) {
                                            bundle.putInt(name, (int) longVal);
                                        } else {
                                            bundle.putLong(name, longVal);
                                        }
                                    } else {
                                        bundle.putDouble(name, doubleVal);
                                    }
                                    break;
                            }
                        }
                    };
                }
            })
            .create();


    public String toJson(AlarmModel alarmModel) {
        return gson.toJson(alarmModel);
    }

    public AlarmModel fromJson(String json) {
        return gson.fromJson(json, AlarmModel.class);
    }
}
