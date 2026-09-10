<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../database/config.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET — список заявок текущего пользователя
if ($method === 'GET') {
    $stmt = $conn->prepare(
        "SELECT o.id, o.title, o.description, o.category, o.price,
                o.created_at, s.name AS status_name, s.color AS status_color
         FROM orders o
         JOIN statuses s ON o.status_id = s.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->bind_param('i', $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }

    echo json_encode(['success' => true, 'orders' => $orders], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST — создание новой заявки
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $errors = [];

    // Обязательные поля
    if (empty(trim($data['title'] ?? '')))    $errors[] = 'Введите название заявки';
    if (empty(trim($data['description'] ?? ''))) $errors[] = 'Введите описание';
    if (empty(trim($data['category'] ?? ''))) $errors[] = 'Выберите категорию';

    if (!empty($data['price']) && !is_numeric($data['price'])) {
        $errors[] = 'Цена должна быть числом';
    }

    if (!empty($errors)) {
        echo json_encode(['success' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $price = !empty($data['price']) ? (float)$data['price'] : 0.00;
    $status_id = 1; // "Новая"

    $stmt = $conn->prepare(
        "INSERT INTO orders (user_id, status_id, title, description, category, price)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param('iisssd',
        $_SESSION['user_id'],
        $status_id,
        $data['title'],
        $data['description'],
        $data['category'],
        $price
    );

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Заявка создана',
            'order_id' => $stmt->insert_id
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'errors' => ['Ошибка создания заявки']], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Метод не разрешён']);