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
    title_en VARCHAR(150),
    description TEXT,
    description_en TEXT,
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

#El campo end_date admite valores NULL para representar "hasta la actualidad"
CREATE TABLE experience (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    title VARCHAR(150) NOT NULL,
    title_en VARCHAR(150),
    company VARCHAR(150) NOT NULL,
    contract_type VARCHAR(100),
    contract_type_en VARCHAR(100),
    description TEXT,
    description_en TEXT,
    location VARCHAR(150),
    location_en VARCHAR(150),
    tags VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password_hash) VALUES
('test@portfolio.com', '$2b$10$EjemploHashContrasenaBcrypt123456789012345678901234567');

INSERT INTO login_logs (user_id, ip_address, user_agent, language, screen_resolution, time_zone) VALUES
(1, '192.168.1.34', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(1, '85.45.22.110', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3)', 'es-ES', '390x844', 'Europe/Madrid'),
(1, '192.168.1.34', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'en-US', '1920x1080', 'Europe/Madrid');

INSERT INTO projects (title, title_en, description, description_en, project_date, repo_url, live_url, image_url, tags, is_featured) VALUES
('E-commerce Web', 'E-commerce Web', 'Tienda online', 'Online store', '2025-05-15', 'https://github.com/usuario/ecommerce', 'http://josemivivass.atwebpages.com/login.html', 'https://placehold.co/800x600/EEE/31343C', 'Angular, Node.js', TRUE),
('Gestor Kanban', 'Kanban Manager', 'Aplicación Kanban', 'Kanban application', '2025-08-22', 'https://github.com/usuario/kanban', 'https://demo.com', 'https://placehold.co/800x600/EEE/31343C', 'HTML, CSS', FALSE),
('Dashboard Analítica', 'Analytics Dashboard', 'Panel interactivo', 'Interactive dashboard', '2025-11-10', 'https://github.com/usuario/dashboard', 'https://demo.com', 'https://placehold.co/800x600/EEE/31343C', 'React', TRUE);

INSERT INTO experience 
(start_date, end_date, title, title_en, company, contract_type, contract_type_en, description, description_en, location, location_en, tags) 
VALUES
('2026-03-01', NULL, 'Desarrollador Full Stack', 'Full Stack Developer', 'Fundación COMPUTAEX', 'Prácticas', 'Internship', 'Actualización y modernización de una aplicación web full-stack. Desarrollo y mantenimiento del backend utilizando Python. Actualización y desarrollo de la interfaz del frontend utilizando React (en entorno Node.js).', 'Updating and modernizing a full-stack web application. Development and maintenance of the backend using Python. Updating and development of the frontend interface using React (in a Node.js environment).', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'Python, Node.js, React'),

('2024-07-01', '2025-07-01', 'Quality Engineering', 'Quality Engineering', 'VIEWNEXT', 'Jornada completa', 'Full-time', 'Realización de pruebas para la app y API de bancos en el proyecto RSI.', 'Testing for the banking app and API in the RSI project.', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'SQL, REST APIs'),

('2024-03-01', '2024-06-01', 'Quality Engineering', 'Quality Engineering', 'VIEWNEXT', 'Prácticas', 'Internship', 'Realización de pruebas de rendimiento para webs.', 'Performance testing for websites.', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'LoadRunner, JMeter'),

('2022-06-01', '2022-08-01', 'Camp Counselor', 'Camp Counselor', 'Camp Hilltop', 'Jornada completa', 'Full-time', 'Organización y supervisión de actividades para niños de 6 a 16 años, como equitación, senderismo y dinámicas grupales.', 'Organization and supervision of activities for children aged 6 to 16, such as horseback riding, hiking, and group dynamics.', 'Hancock, Nueva York, Estados Unidos', 'Hancock, New York, United States', 'Soft Skills, ESL');