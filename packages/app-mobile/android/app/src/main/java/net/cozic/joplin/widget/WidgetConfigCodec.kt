package net.cozic.joplin.widget

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

object WidgetConfigCodec {
	fun serialize(actions: List<WidgetAction>): String {
		val array = JSONArray()
		for (action in actions) {
			array.put(JSONObject().put("type", action.type).put("title", action.title))
		}
		return array.toString()
	}

	fun deserialize(json: String?): List<WidgetAction> {
		if (json == null) return DefaultWidgetActions.all
		return try {
			val array = JSONArray(json)
			val actions = mutableListOf<WidgetAction>()
			for (i in 0 until array.length()) {
				val obj = array.getJSONObject(i)
				actions.add(WidgetAction(obj.getString("type"), obj.getString("title")))
			}
			actions.ifEmpty { DefaultWidgetActions.all }
		} catch (error: JSONException) {
			DefaultWidgetActions.all
		}
	}
}
