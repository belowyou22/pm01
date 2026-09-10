-- Создание базы данных
CREATE DATABASE IF NOT EXISTS service_center CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE service_center;

-- Таблица пользователей
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login (login),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Таблица статусов
CREATE TABLE statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    color VARCHAR(20) DEFAULT '#808080'
) ENGINE=InnoDB;

-- Таблица заявок
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status_id INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_status_id (status_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Вставка начальных данных
INSERT INTO statuses (name, description, color) VALUES
('Новая', 'Заявка только создана', '#FFA500'),
('В работе', 'Заявка обрабатывается', '#2196F3'),
('Выполнена', 'Заявка завершена', '#4CAF50'),
('Отклонена', 'Заявка отклонена', '#F44336');

INSERT INTO users (login, password, full_name, phone, email, role) VALUES
('admin', '$2y$10$YourHashedPasswordHere', 'Администратор', '+7(999)123-45-67', 'admin@example.com', 'admin');