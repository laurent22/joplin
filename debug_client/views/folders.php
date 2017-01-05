<table>
	<tr><th>Title</th><th></th><th></th></tr>
	<?php foreach ($folders as $folder): ?>
		<tr>
			<td>
				<a href="/?action=folder&folder_id=<?php echo $folder['id']; ?>"><?php echo htmlentities($folder['title']); ?></a>
			</td>
			<td>
				<a href="/?action=notes&folder_id=<?php echo $folder['id']; ?>">View notes</a>
			</td>
			<td>
				<form method="post">
					<input type="hidden" value="<?php echo htmlentities($folder['id']); ?>" name="folder_id">
					<input type="submit" value="Delete" name="delete_folder" />
				</form>
			</td>
		</tr>
	<?php endforeach; ?>
</table>

<hr/>

<form method="post">
	<div class="form-group">
		<label for="folder_title">Folder title</label>
		<input type="text" class="form-control" name="folder_title" >
	</div>
	<input type="submit" value="Create" name="create_folder" />
</form>