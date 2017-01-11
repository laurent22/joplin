<!DOCTYPE html>
<html>
<head>
<title><?php echo htmlentities($title); ?></title>
<link rel="stylesheet" type="text/css" href="/css/style.css">
</head>
<body>
	<a href="/">Home</a>
	<h1><?php echo htmlentities($title); ?></h1>
	<?php echo $contentHtml; ?>
	<hr/>
	<div class="debug">
		<p>Base URL: <?php echo htmlentities($baseUrl); ?></p>
		<?php for ($i = count($curlCommands) - 1; $i >= 0; $i--): $cmd = $curlCommands[$i]; ?>
			<?php echo $cmd; ?><br/>
		<?php endfor; ?>
	</div>
</body>
</head>