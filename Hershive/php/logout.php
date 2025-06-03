<?php
session_start();
session_unset();
session_destroy();

setcookie(session_name(), '', time() - 3600, '/');

header("Location: ../html/login.html");
exit;
