<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../database/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не разрешён']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$errors = [];

if (empty(trim($data['login'] ?? ''))) {
    $errors[] = 'Введите логин';
}
if (empty(trim($data['password'] ?? ''))) {
    $errors[] = 'Введите пароль';
}

if (!empty($errors)) {
    echo json_encode(['success' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $conn->prepare("SELECT id, login, password, full_name, role FROM users WHERE login = ?");
$stmt->bind_param('s', $data['login']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'errors' => ['Пользователь не найден']], JSON_UNESCAPED_UNICODE);
    exit;
}

$user = $result->fetch_assoc();

if (!password_verify($data['password'], $user['password'])) {
    echo json_encode(['success' => false, 'errors' => ['Неверный пароль']], JSON_UNESCAPED_UNICODE);
    exit;
}

// Успешная авторизация — сохранение в сессии
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_login'] = $user['login'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['user_role'] = $user['role'];

$redirect = ($user['role'] === 'admin') ? 'admin-panel.html' : 'user-dashboard.html';

echo json_encode([
    'success' => true,
    'message' => 'Вход выполнен',
    'role' => $user['role'],
    'redirect' => $redirect
], JSON_UNESCAPED_UNICODE);

$stmt->close();
$conn->close();
?>