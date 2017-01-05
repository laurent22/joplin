<table>
	<tr><th>Title</th></tr>
	<?php foreach ($notes as $note): ?>
		<tr><td><a href="/?action=notes&note_id=<?php echo $note['id']; ?>"><?php echo htmlentities($note['title']); ?></a></td></tr>
	<?php endforeach; ?>
</table>