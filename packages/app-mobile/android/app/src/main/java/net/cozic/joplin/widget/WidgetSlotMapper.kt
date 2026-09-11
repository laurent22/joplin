package net.cozic.joplin.widget

data class WidgetSlot(val slotIndex: Int, val action: WidgetAction?)

object WidgetSlotMapper {
	const val SLOT_COUNT = 5

	fun slotsFor(actions: List<WidgetAction>): List<WidgetSlot> {
		val selected = actions.take(SLOT_COUNT)
		return (0 until SLOT_COUNT).map { index ->
			WidgetSlot(index, selected.getOrNull(index))
		}
	}
}
