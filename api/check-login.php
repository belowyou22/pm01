<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../database/config.php';

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$login = trim($data['login'] ?? '');

if ($login === '') {
    echo json_encode(['available' => false]);
    exit;
}

$stmt = $conn->prepare("SELECT id FROM users WHERE login = ?");
$stmt->bind_param('s', $login);
$stmt->execute();

echo json_encode(['available' => $stmt->get_result()->num_rows === 0]);