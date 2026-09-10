package net.cozic.joplin.widget

import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetConfigCodecTest {
	@Test
	fun roundTripsAnOrderedConfig() {
		val actions = listOf(
			WidgetAction("newPhoto", "New photo"),
			WidgetAction("newNote", "New note"),
		)
		assertEquals(actions, WidgetConfigCodec.deserialize(WidgetConfigCodec.serialize(actions)))
	}

	@Test
	fun fallsBackToDefaultsWhenConfigIsMissing() {
		assertEquals(DefaultWidgetActions.all, WidgetConfigCodec.deserialize(null))
	}

	@Test
	fun fallsBackToDefaultsOnCorruptJson() {
		assertEquals(DefaultWidgetActions.all, WidgetConfigCodec.deserialize("not json"))
	}

	@Test
	fun fallsBackToDefaultsOnEmptyConfig() {
		assertEquals(DefaultWidgetActions.all, WidgetConfigCodec.deserialize("[]"))
	}

	@Test
	fun defaultsContainAllFiveActionsInCanonicalOrder() {
		assertEquals(
			listOf("newNote", "newTodo", "newPhoto", "newResource", "newDrawing"),
			DefaultWidgetActions.all.map { it.type },
		)
	}
}
