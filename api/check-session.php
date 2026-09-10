<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../database/config.php';

if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    exit;
}

echo json_encode([
    'success' => true,
    'user' => [
        'id' => $_SESSION['user_id'],
        'login' => $_SESSION['user_login'],
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role']
    ]
], JSON_UNESCAPED_UNICODE);
