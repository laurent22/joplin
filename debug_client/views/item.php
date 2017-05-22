<form method="post">
	<?php foreach ($item as $k => $v): ?>
		<div class="form-group">
			<label><?php echo htmlentities($k); ?></label>
			<input type="text" class="form-control" name="item_<?php echo htmlentities($k); ?>" value="<?php echo htmlentities($v); ?>" >
		</div>
	<?php endforeach; ?>
	<input type="hidden" value="<?php echo htmlentities(json_encode($item)); ?>" name="original_item" />
	<input type="hidden" value="<?php echo $type; ?>" name="type" />
	<input type="submit" value="Save" name="update_item" />
</form>