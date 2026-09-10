package net.cozic.joplin.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetSlotMapperTest {
	@Test
	fun mapsSelectedActionsToSlotsInOrderAndHidesTheRest() {
		val actions = listOf(
			WidgetAction("newPhoto", "New photo"),
			WidgetAction("newNote", "New note"),
		)
		val slots = WidgetSlotMapper.slotsFor(actions, showLabels = true)

		assertEquals(WidgetSlotMapper.SLOT_COUNT, slots.size)
		assertEquals("newPhoto", slots[0].action?.type)
		assertEquals("newNote", slots[1].action?.type)
		assertNull(slots[2].action)
		assertNull(slots[3].action)
		assertNull(slots[4].action)
	}

	@Test
	fun emptySelectionHidesAllSlots() {
		val slots = WidgetSlotMapper.slotsFor(emptyList(), showLabels = false)
		assertEquals(WidgetSlotMapper.SLOT_COUNT, slots.count { it.action == null })
	}

	@Test
	fun propagatesLabelVisibilityToEverySlot() {
		val shown = WidgetSlotMapper.slotsFor(listOf(WidgetAction("newNote", "New note")), true)
		val hidden = WidgetSlotMapper.slotsFor(listOf(WidgetAction("newNote", "New note")), false)
		assertEquals(listOf(true, true, true, true, true), shown.map { it.labelVisible })
		assertEquals(listOf(false, false, false, false, false), hidden.map { it.labelVisible })
	}

	@Test
	fun moreActionsThanSlotsAreTruncated() {
		val actions = (1..7).map { WidgetAction("type$it", "Title $it") }
		val slots = WidgetSlotMapper.slotsFor(actions, showLabels = true)
		assertEquals(WidgetSlotMapper.SLOT_COUNT, slots.size)
		assertEquals("type5", slots[4].action?.type)
	}
}
