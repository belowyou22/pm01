<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../database/config.php';

// Только для админа
if (empty($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Доступ запрещён']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET — все заявки
if ($method === 'GET') {
    $sql = "SELECT o.id, o.title, o.description, o.category, o.price,
                   o.created_at, o.updated_at,
                   s.id AS status_id, s.name AS status_name, s.color AS status_color,
                   u.id AS user_id, u.login, u.full_name, u.phone, u.email
            FROM orders o
            JOIN statuses s ON o.status_id = s.id
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC";

    $result = $conn->query($sql);
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }

    // Список статусов
    $statuses = [];
    $sr = $conn->query("SELECT id, name, color FROM statuses ORDER BY id");
    while ($row = $sr->fetch_assoc()) {
        $statuses[] = $row;
    }

    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'statuses' => $statuses
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST — смена статуса
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    if (empty($data['order_id']) || empty($data['status_id'])) {
        echo json_encode(['success' => false, 'message' => 'Не указан заказ или статус']);
        exit;
    }

    $order_id = (int)$data['order_id'];
    $status_id = (int)$data['status_id'];

    // Проверка что статус существует
    $check = $conn->prepare("SELECT id FROM statuses WHERE id = ?");
    $check->bind_param('i', $status_id);
    $check->execute();
    if ($check->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Статус не найден']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE orders SET status_id = ? WHERE id = ?");
    $stmt->bind_param('ii', $status_id, $order_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Статус обновлён'], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'message' => 'Ошибка обновления'], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Метод не разрешён']);