<?php
require_once '../database/config.php';
session_destroy();
header('Content-Type: application/json');
echo json_encode(['success' => true]);