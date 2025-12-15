<?php
session_start();
if (!isset($_SESSION['username'])) {
  header('Location: /TCC/public/index.html');
  exit();
}
header('Location: /TCC/public/home.php?view=settings');
exit();
