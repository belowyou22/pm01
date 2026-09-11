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

// ================= GET — список заявок с фильтрами и пагинацией =================
if ($method === 'GET') {
    // Параметры фильтрации
    $status_id   = isset($_GET['status_id']) && $_GET['status_id'] !== '' ? (int)$_GET['status_id'] : null;
    $category    = isset($_GET['category']) && $_GET['category'] !== '' ? trim($_GET['category']) : null;
    $search      = isset($_GET['search']) && $_GET['search'] !== '' ? trim($_GET['search']) : null;
    $page        = isset($_GET['page']) && (int)$_GET['page'] > 0 ? (int)$_GET['page'] : 1;
    $per_page    = 10;
    $offset      = ($page - 1) * $per_page;

    // Сборка WHERE
    $where = [];
    $params = [];
    $types = '';

    if ($status_id !== null) {
        $where[] = 'o.status_id = ?';
        $params[] = $status_id;
        $types .= 'i';
    }

    if ($category !== null) {
        $where[] = 'o.category = ?';
        $params[] = $category;
        $types .= 's';
    }

    if ($search !== null) {
        $where[] = '(o.title LIKE ? OR o.description LIKE ? OR u.full_name LIKE ? OR u.login LIKE ?)';
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $types .= 'ssss';
    }

    $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    // 1. Общее количество (для пагинации)
    $countSql = "SELECT COUNT(*) AS total
                 FROM orders o
                 JOIN users u ON o.user_id = u.id
                 $whereSql";
    $stmt = $conn->prepare($countSql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $total = (int)$stmt->get_result()->fetch_assoc()['total'];
    $stmt->close();

    // 2. Список заявок (с LIMIT/OFFSET)
    $sql = "SELECT o.id, o.title, o.description, o.category, o.price,
                   o.created_at, o.updated_at,
                   s.id AS status_id, s.name AS status_name, s.color AS status_color,
                   u.id AS user_id, u.login, u.full_name, u.phone, u.email
            FROM orders o
            JOIN statuses s ON o.status_id = s.id
            JOIN users u ON o.user_id = u.id
            $whereSql
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?";

    $paramsWithLimit = $params;
    $paramsWithLimit[] = $per_page;
    $paramsWithLimit[] = $offset;
    $typesWithLimit = $types . 'ii';

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($typesWithLimit, ...$paramsWithLimit);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    $stmt->close();

    // 3. Список статусов и категорий (для фильтров)
    $statuses = [];
    $sr = $conn->query("SELECT id, name, color FROM statuses ORDER BY id");
    while ($row = $sr->fetch_assoc()) {
        $statuses[] = $row;
    }

    $categories = [];
    $cr = $conn->query("SELECT DISTINCT category FROM orders WHERE category <> '' ORDER BY category");
    while ($row = $cr->fetch_assoc()) {
        $categories[] = $row['category'];
    }

    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'statuses' => $statuses,
        'categories' => $categories,
        'pagination' => [
            'page' => $page,
            'per_page' => $per_page,
            'total' => $total,
            'total_pages' => max(1, (int)ceil($total / $per_page)),
            'from' => $total > 0 ? $offset + 1 : 0,
            'to' => min($offset + $per_page, $total)
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ================= POST — смена статуса =================
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? 'change_status';

    // ---------- Смена статуса ----------
    if ($action === 'change_status') {
        if (empty($data['order_id']) || empty($data['status_id'])) {
            echo json_encode(['success' => false, 'message' => 'Не указан заказ или статус']);
            exit;
        }

        $order_id = (int)$data['order_id'];
        $status_id = (int)$data['status_id'];
        $comment = isset($data['comment']) ? trim($data['comment']) : '';
        $admin_id = (int)$_SESSION['user_id'];

        // Проверяем, что статус существует
        $check = $conn->prepare("SELECT id, name FROM statuses WHERE id = ?");
        $check->bind_param('i', $status_id);
        $check->execute();
        $statusResult = $check->get_result();

        if ($statusResult->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Статус не найден']);
            exit;
        }
        $statusRow = $statusResult->fetch_assoc();
        $check->close();

        // Получаем текущий статус заявки
        $cur = $conn->prepare("SELECT status_id FROM orders WHERE id = ?");
        $cur->bind_param('i', $order_id);
        $cur->execute();
        $curResult = $cur->get_result();

        if ($curResult->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Заявка не найдена']);
            exit;
        }
        $oldStatusId = (int)$curResult->fetch_assoc()['status_id'];
        $cur->close();

        // Если статус не изменился — выходим
        if ($oldStatusId === $status_id) {
            echo json_encode(['success' => true, 'message' => 'Статус не изменился']);
            exit;
        }

        // Транзакция: обновляем статус + пишем в историю
        $conn->begin_transaction();

        try {
            $stmt = $conn->prepare("UPDATE orders SET status_id = ? WHERE id = ?");
            $stmt->bind_param('ii', $status_id, $order_id);
            $stmt->execute();
            $stmt->close();

            $histComment = $comment !== ''
                ? $comment
                : 'Статус изменён на «' . $statusRow['name'] . '»';

            $hist = $conn->prepare(
                "INSERT INTO order_status_history (order_id, status_id, changed_by, comment)
                 VALUES (?, ?, ?, ?)"
            );
            $hist->bind_param('iiis', $order_id, $status_id, $admin_id, $histComment);
            $hist->execute();
            $hist->close();

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Статус обновлён: ' . $statusRow['name']
            ], JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['success' => false, 'message' => 'Ошибка обновления']);
        }
        exit;
    }

    // ---------- Получение истории заявки ----------
    if ($action === 'get_history') {
        if (empty($data['order_id'])) {
            echo json_encode(['success' => false, 'message' => 'Не указан заказ']);
            exit;
        }

        $order_id = (int)$data['order_id'];

        $sql = "SELECT h.id, h.comment, h.created_at,
                       s.name AS status_name, s.color AS status_color,
                       u.full_name AS admin_name, u.login AS admin_login
                FROM order_status_history h
                JOIN statuses s ON h.status_id = s.id
                JOIN users u ON h.changed_by = u.id
                WHERE h.order_id = ?
                ORDER BY h.created_at DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $order_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $history = [];
        while ($row = $result->fetch_assoc()) {
            $history[] = $row;
        }
        $stmt->close();

        echo json_encode([
            'success' => true,
            'history' => $history
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Неизвестное действие']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Метод не разрешён']);