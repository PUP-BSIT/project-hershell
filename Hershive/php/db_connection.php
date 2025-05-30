<?php
// db.php
$host = "localhost";
$db_user = "u954940298_hershell";
$db_pass = "Hershell_db_p4ss";
$dbname = "u954940298_hershive_db";

$conn = new mysqli($host, $db_user, $db_pass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>