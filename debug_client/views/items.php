<table>
	<tr><th>ID</th><th>Title</th><th></th><th></th></tr>
	<?php foreach ($items as $item): ?>
		<tr>
			<td>
				<a href="/?action=item&type=<?php echo $type; ?>&item_id=<?php echo $item['id']; ?>"><?php echo htmlentities($item['id']); ?></a>
			</td>
			<td>
				<?php echo htmlentities($item['title']); ?>
			</td>
			<?php if ($type == 'folder'): ?>
				<td>
					<a href="/?action=items&type=note&parent_id=<?php echo $item['id']; ?>">View notes</a>
				</td>
			<?php endif; ?>
			<td>
				<form method="post">
					<input type="hidden" value="<?php echo $type; ?>" name="type">
					<input type="hidden" value="<?php echo htmlentities($item['id']); ?>" name="item_id">
					<input type="submit" value="Delete" name="delete_item" />
				</form>
			</td>
		</tr>
	<?php endforeach; ?>
</table>

<hr/>

<form method="post">
	<div class="form-group">
		<label for="item_title">Title</label>
		<input type="hidden" class="form-control" name="type" value="<?php echo $type; ?>" >
		<input type="hidden" class="form-control" name="parent_id" value="<?php echo $parentId; ?>" >
		<input type="text" class="form-control" name="item_title" >
	</div>
	<input type="submit" value="Create" name="create_item" />
</form>