DROP DATABASE IF EXISTS portfolio;
CREATE DATABASE IF NOT EXISTS portfolio;
USE portfolio;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    language VARCHAR(10),
    screen_resolution VARCHAR(20),
    time_zone VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE visitor_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_uuid VARCHAR(36) NOT NULL,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_logged_in BOOLEAN DEFAULT FALSE
);

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    project_date DATE,
    repo_url VARCHAR(255),
    live_url VARCHAR(255),
    image_url VARCHAR(255),
    tags VARCHAR(255),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password_hash) VALUES
('test@portfolio.com', '$2b$10$EjemploHashContrasenaBcrypt123456789012345678901234567');

INSERT INTO login_logs (user_id, ip_address, user_agent, language, screen_resolution, time_zone) VALUES
(1, '192.168.1.34', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(1, '85.45.22.110', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3)', 'es-ES', '390x844', 'Europe/Madrid'),
(1, '192.168.1.34', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'en-US', '1920x1080', 'Europe/Madrid');

INSERT INTO projects (title, description, project_date, repo_url, live_url, image_url, tags, is_featured) VALUES
('E-commerce Web', 'Tienda online', '2025-05-15', 'https://github.com/usuario/ecommerce', 'http://josemivivass.atwebpages.com/login.html', 'https://placehold.co/800x600/EEE/31343C', 'Angular, Node.js', TRUE),
('Gestor Kanban', 'Aplicación Kanban', '2025-08-22', 'https://github.com/usuario/kanban', 'https://demo.com', 'https://placehold.co/800x600/EEE/31343C', 'HTML, CSS', FALSE),
('Dashboard Analítica', 'Panel interactivo', '2025-11-10', 'https://github.com/usuario/dashboard', 'https://demo.com', 'https://placehold.co/800x600/EEE/31343C', 'React', TRUE);