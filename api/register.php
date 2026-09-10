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

// 1. Проверка на пустые поля (ВСЕ обязательны)
$required = ['login', 'password', 'full_name', 'phone', 'email'];
foreach ($required as $field) {
    if (empty(trim($data[$field] ?? ''))) {
        $errors[] = "Поле обязательно для заполнения";
    }
}

// 2. Форматная валидация
if (!empty($data['login'])) {
    if (mb_strlen($data['login']) < 3) {
        $errors[] = 'Логин должен быть не менее 3 символов';
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['login'])) {
        $errors[] = 'Логин: только латиница, цифры и _';
    }
}

if (!empty($data['password'])) {
    if (mb_strlen($data['password']) < 6) {
        $errors[] = 'Пароль должен быть не менее 6 символов';
    }
    if (!preg_match('/[A-Za-z]/', $data['password']) || !preg_match('/\d/', $data['password'])) {
        $errors[] = 'Пароль должен содержать буквы и цифры';
    }
}

if (!empty($data['full_name'])) {
    if (!preg_match('/^[а-яА-ЯёЁ\s\-]+$/u', $data['full_name'])) {
        $errors[] = 'ФИО: только кириллица, пробелы и дефис';
    }
}

if (!empty($data['phone'])) {
    if (!preg_match('/^\+?[0-9\s\-\(\)]{10,18}$/', $data['phone'])) {
        $errors[] = 'Неверный формат телефона';
    }
}

if (!empty($data['email'])) {
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Неверный формат email';
    }
}

// 3. Уникальность логина
if (empty($errors)) {
    $stmt = $conn->prepare("SELECT id FROM users WHERE login = ?");
    $stmt->bind_param('s', $data['login']);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        $errors[] = 'Такой логин уже занят';
    }
    $stmt->close();
}

if (!empty($errors)) {
    echo json_encode(['success' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    exit;
}

// 4. Запись в БД
$hash = password_hash($data['password'], PASSWORD_DEFAULT);
$stmt = $conn->prepare(
    "INSERT INTO users (login, password, full_name, phone, email, role)
     VALUES (?, ?, ?, ?, ?, 'user')"
);
$stmt->bind_param('sssss',
    $data['login'],
    $hash,
    $data['full_name'],
    $data['phone'],
    $data['email']
);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Регистрация успешна',
        'redirect' => 'login.html'
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['success' => false, 'errors' => ['Ошибка записи в БД']], JSON_UNESCAPED_UNICODE);
}

$stmt->close();
$conn->close();
?>