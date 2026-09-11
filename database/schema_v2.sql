-- =====================================================
-- Модуль 3. Доработка базы данных
-- Миграция поверх schema.sql (НЕ пересоздаёт таблицы)
-- =====================================================

USE service_center;

-- -----------------------------------------------------
-- 1. Таблица истории смены статусов заявок
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by INT NOT NULL,           -- кто сменил (user_id админа)
    comment VARCHAR(255) DEFAULT NULL, -- опциональный комментарий
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE RESTRICT,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_history_order (order_id),
    INDEX idx_history_created (created_at),
    INDEX idx_history_order_created (order_id, created_at DESC)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 2. Заполняем историю для существующих заявок
-- (запись о первичном статусе)
-- -----------------------------------------------------
INSERT INTO order_status_history (order_id, status_id, changed_by, comment, created_at)
SELECT o.id, o.status_id, o.user_id, 'Первичное создание заявки', o.created_at
FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM order_status_history h WHERE h.order_id = o.id
);

-- -----------------------------------------------------
-- 3. Дополнительные индексы
-- -----------------------------------------------------

-- Составной индекс: заявки пользователя по статусу
CREATE INDEX idx_orders_user_status ON orders(user_id, status_id);

-- Составной индекс: заявки по статусу и дате
CREATE INDEX idx_orders_status_created ON orders(status_id, created_at DESC);

-- Индекс для фильтра по категории + дате
CREATE INDEX idx_orders_category_created ON orders(category, created_at DESC);

-- -----------------------------------------------------
-- 4. FULLTEXT-индекс для поиска (покрытие фильтра из М2)
-- -----------------------------------------------------
ALTER TABLE orders
    ADD FULLTEXT INDEX idx_orders_fulltext (title, description);

-- -----------------------------------------------------
-- 5. CHECK-ограничения (MySQL 8.0.16+)
-- -----------------------------------------------------

-- Цена не может быть отрицательной
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_price CHECK (price >= 0);

-- Название не может быть короче 3 символов
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_title CHECK (CHAR_LENGTH(title) >= 3);

-- Категория не может быть пустой
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_category CHECK (CHAR_LENGTH(category) >= 1);

-- -----------------------------------------------------
-- 6. Триггер: автоматическая запись в историю
-- при смене статуса заявки
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS trg_orders_status_history;

DELIMITER //
CREATE TRIGGER trg_orders_status_history
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.status_id <> NEW.status_id THEN
        INSERT INTO order_status_history (order_id, status_id, changed_by, comment)
        VALUES (NEW.id, NEW.status_id, NEW.user_id, 'Смена статуса');
    END IF;
END//
DELIMITER ;

-- -----------------------------------------------------
-- Проверка
-- -----------------------------------------------------
SELECT 'Миграция применена успешно' AS result;
SELECT COUNT(*) AS history_records FROM order_status_history;
SELECT COUNT(*) AS indexes_on_orders FROM information_schema.statistics WHERE table_name = 'orders';