<table>
	<tr>
		<th>ID</th>
		<th>Type</th>
		<th>Item type</th>
		<th>Item ID</th>
		<th>Item</th>
	</tr>
	<?php for ($i = count($changes['items']) - 1; $i >= 0; $i--): $it = $changes['items'][$i]; $t = $it['type']; ?>
		<tr>
			<td><?php echo htmlentities($it['id']); ?></td>
			<td><?php echo htmlentities($it['type']); ?></td>
			<td><?php echo htmlentities($it['item_type']); ?></td>
			<td><?php echo htmlentities($it['item_id']); ?></td>
			<td><?php echo htmlentities($it['type'] == 'update' ? json_encode($it['item']) : ''); ?></td>
		</tr>
	<?php endfor; ?>
</table>