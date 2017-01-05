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
</body>
</head>