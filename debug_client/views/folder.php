<form method="post">
	<?php foreach ($folder as $k => $v): ?>
		<div class="form-group">
			<label><?php echo htmlentities($k); ?></label>
			<input type="text" class="form-control" name="folder_<?php echo htmlentities($k); ?>" value="<?php echo htmlentities($v); ?>" >
		</div>
	<?php endforeach; ?>
	<input type="hidden" value="<?php echo htmlentities(json_encode($folder)); ?>" name="original_folder" />
	<input type="submit" value="Save" name="update_folder" />
</form>