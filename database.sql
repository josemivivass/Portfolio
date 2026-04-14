DROP DATABASE IF EXISTS portfolio;
CREATE DATABASE IF NOT EXISTS portfolio;
USE portfolio;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'user') NOT NULL DEFAULT 'user',
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
    is_answered BOOLEAN NOT NULL DEFAULT FALSE,
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

INSERT INTO users (email, password_hash, role) VALUES
('admin@gmail.com', '$2b$10$4CdvJxThn2PR0wEeo71kkOx8vzvREb8uUv80tnLpHnOq5t2yXrsE2', 'admin'),
('pepepe@gmail.com', '$2b$10$ZBPkPqBb6rSIyGyoOmbcDOVls2o9VtWZlm4i8oGbBfpZZGXk99kQm', 'editor'),
('popopo@gmail.com', '$2b$10$a/LGkc845utqQOrHq5kV4O.NYFx/RBEnBteVAJ1cYPIwn1/SnqtG2', 'user');

INSERT INTO projects (title, title_en, description, description_en, project_date, repo_url, live_url, image_url, tags, is_featured) VALUES
('E-commerce Web', 'E-commerce Web', 'Tienda online', 'Online store', '2025-05-15', 'https://github.com/usuario/ecommerce', 'http://josemivivass.atwebpages.com/login.html', 'https://placehold.co/800x600/EEE/31343C', 'Angular, Node.js', TRUE),
('Gestor Kanban', 'Kanban Manager', 'Aplicación Kanban', 'Kanban application', '2025-08-22', 'https://github.com/usuario/kanban', 'https://demo.com', 'https://placehold.co/800x600/EEE/31343C', 'HTML, CSS', FALSE),
('Dashboard Analítica', 'Analytics Dashboard', 'Panel interactivo', 'Interactive dashboard', '2025-11-10', 'https://github.com/usuario/dashboard', 'https://demo.com', 'https://placehold.co/800x600/EEE/31343C', 'React', TRUE);

INSERT INTO experience (start_date, end_date, title, title_en, company, contract_type, contract_type_en, description, description_en, location, location_en, tags) VALUES
('2026-03-01', NULL, 'Desarrollador Full Stack', 'Full Stack Developer', 'Fundación COMPUTAEX', 'Prácticas', 'Internship', 'Actualización y modernización de una aplicación web full-stack. Desarrollo y mantenimiento del backend utilizando Python. Actualización y desarrollo de la interfaz del frontend utilizando React (en entorno Node.js).', 'Updating and modernizing a full-stack web application. Development and maintenance of the backend using Python. Updating and development of the frontend interface using React (in a Node.js environment).', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'Python, Node.js, React'),
('2024-07-01', '2025-07-01', 'Quality Engineering', 'Quality Engineering', 'VIEWNEXT', 'Jornada completa', 'Full-time', 'Realización de pruebas para la app y API de bancos en el proyecto RSI.', 'Testing for the banking app and API in the RSI project.', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'SQL, REST APIs'),
('2024-03-01', '2024-06-01', 'Quality Engineering', 'Quality Engineering', 'VIEWNEXT', 'Prácticas', 'Internship', 'Realización de pruebas de rendimiento para webs.', 'Performance testing for websites.', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'LoadRunner, JMeter'),
('2022-06-01', '2022-08-01', 'Camp Counselor', 'Camp Counselor', 'Camp Hilltop', 'Jornada completa', 'Full-time', 'Organización y supervisión de actividades para niños de 6 a 16 años, como equitación, senderismo y dinámicas grupales.', 'Organization and supervision of activities for children aged 6 to 16, such as horseback riding, hiking, and group dynamics.', 'Hancock, Nueva York, Estados Unidos', 'Hancock, New York, United States', 'Soft Skills, ESL');

INSERT INTO login_logs (user_id, login_time, ip_address, user_agent, language, screen_resolution, time_zone) VALUES
(2, '2026-03-31 09:15:00', '80.58.253.11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(3, '2026-04-01 10:30:22', '188.117.50.22', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'en-GB', '2560x1440', 'Europe/London'),
(1, '2026-04-01 14:45:10', '212.34.11.89', 'Mozilla/5.0 (X11; Linux x86_64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(2, '2026-04-03 10:05:33', '80.58.253.11', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)', 'es-ES', '390x844', 'Europe/Madrid'),
(3, '2026-04-04 08:20:05', '188.117.50.22', 'Mozilla/5.0 (iPad; CPU OS 16_5)', 'en-GB', '810x1080', 'Europe/London'),
(1, '2026-04-04 09:50:40', '85.45.22.110', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1366x768', 'Europe/Madrid'),
(2, '2026-04-04 11:15:15', '192.168.1.33', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0)', 'es-ES', '412x915', 'Europe/Madrid'),
(1, '2026-04-04 14:10:00', '212.34.11.89', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(3, '2026-04-04 19:30:50', '203.0.113.15', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'en-US', '1440x900', 'America/New_York'),
(1, '2026-04-05 11:45:20', '212.34.11.89', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(2, '2026-04-07 22:10:00', '80.58.253.11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(3, '2026-04-08 09:25:35', '188.117.50.22', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'en-GB', '430x932', 'Europe/London'),
(1, '2026-04-09 08:10:00', '85.45.22.110', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'es-ES', '2560x1440', 'Europe/Madrid'),
(2, '2026-04-11 15:30:00', '80.58.253.11', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)', 'es-ES', '390x844', 'Europe/Madrid'),
(3, '2026-04-12 08:15:00', '188.117.50.22', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'en-GB', '2560x1440', 'Europe/London'),
(1, '2026-04-12 10:20:00', '212.34.11.89', 'Mozilla/5.0 (X11; Linux x86_64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(2, '2026-04-12 12:45:00', '80.58.253.11', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(1, '2026-04-12 16:30:00', '85.45.22.110', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1366x768', 'Europe/Madrid'),
(3, '2026-04-12 21:05:00', '203.0.113.15', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'en-US', '1440x900', 'America/New_York'),
(2, '2026-04-12 23:50:00', '192.168.1.33', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0)', 'es-ES', '412x915', 'Europe/Madrid'),
(1, '2026-04-13 09:15:00', '212.34.11.89', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'es-ES', '1920x1080', 'Europe/Madrid'),
(3, '2026-04-14 08:05:00', '188.117.50.22', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'en-GB', '430x932', 'Europe/London');

INSERT INTO visitor_logs (visitor_uuid, entry_time, ip_address, user_agent, is_logged_in) VALUES
('11111111-2222-3333-4444-555555555555', '2026-03-31 10:20:00', '80.58.253.12', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', FALSE),
('22222222-3333-4444-5555-666666666666', '2026-04-01 15:45:12', '188.117.50.23', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', TRUE),
('33333333-4444-5555-6666-777777777777', '2026-04-03 09:30:45', '212.34.11.90', 'Mozilla/5.0 (X11; Linux x86_64)', FALSE),
('44444444-5555-6666-7777-888888888888', '2026-04-04 07:15:20', '85.45.22.111', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)', FALSE),
('55555555-6666-7777-8888-999999999999', '2026-04-04 11:40:55', '203.0.113.16', 'Mozilla/5.0 (iPad; CPU OS 16_5)', TRUE),
('66666666-7777-8888-9999-000000000000', '2026-04-04 14:05:30', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', FALSE),
('77777777-8888-9999-0000-111111111111', '2026-04-04 16:50:10', '80.58.253.13', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0)', TRUE),
('88888888-9999-0000-1111-222222222222', '2026-04-04 21:15:25', '188.117.50.24', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', FALSE),
('99999999-0000-1111-2222-333333333333', '2026-04-04 23:20:40', '212.34.11.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', TRUE),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '2026-04-05 13:35:15', '85.45.22.112', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', FALSE),
('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '2026-04-07 17:45:50', '203.0.113.17', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', TRUE),
('cccccccc-dddd-eeee-ffff-000000000000', '2026-04-08 09:05:22', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', FALSE),
('dddddddd-eeee-ffff-0000-111111111111', '2026-04-09 10:15:00', '80.58.253.14', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', FALSE),
('eeeeeeee-ffff-0000-1111-222222222222', '2026-04-11 14:20:00', '188.117.50.25', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', TRUE),
('ffffffff-0000-1111-2222-333333333333', '2026-04-12 08:00:10', '212.34.11.92', 'Mozilla/5.0 (X11; Linux x86_64)', FALSE),
('00000000-1111-2222-3333-444444444444', '2026-04-12 10:30:25', '85.45.22.113', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5)', FALSE),
('11111111-2222-3333-4444-555555555556', '2026-04-12 13:45:40', '203.0.113.18', 'Mozilla/5.0 (iPad; CPU OS 16_5)', TRUE),
('22222222-3333-4444-5555-666666666667', '2026-04-12 15:10:55', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', FALSE),
('33333333-4444-5555-6666-777777777778', '2026-04-12 18:55:10', '80.58.253.15', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0)', TRUE),
('44444444-5555-6666-7777-888888888889', '2026-04-12 20:20:25', '188.117.50.26', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', FALSE),
('55555555-6666-7777-8888-999999999990', '2026-04-13 09:35:40', '212.34.11.93', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', TRUE),
('66666666-7777-8888-9999-000000000001', '2026-04-14 08:50:55', '85.45.22.114', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', FALSE);

INSERT INTO contact_messages (name, email, message, created_at) VALUES
('Javier Mendoza', 'javi.mendoza@empresa.com', 'Quería consultar tus tarifas para un desarrollo a medida en React.', '2026-04-01 11:00:00'),
('Marta López', 'martalopez_hr@agencia.es', 'Tenemos una vacante de Full Stack que encaja perfectamente con tu perfil.', '2026-04-03 16:30:15'),
('Pedro Jiménez', 'pjimenez@startup.io', '¿Tienes experiencia trabajando con bases de datos no relacionales?', '2026-04-04 09:15:30'),
('Sofía Rivas', 'sofia.rivas@design.com', '¡Excelente portfolio! Me encanta el diseño de la interfaz.', '2026-04-04 11:45:45'),
('David Costa', 'david.costa@freelance.net', 'Me gustaría proponerte una colaboración para un proyecto internacional.', '2026-04-04 14:20:00'),
('Lucía Vargas', 'lvargas88@gmail.com', 'Tengo un problema con un código similar a tu E-commerce, ¿ofreces mentorías?', '2026-04-04 18:50:12'),
('Andrés Gil', 'agil@consultora.es', 'Por favor, envíanos tu CV actualizado a este correo, nos interesa tu perfil.', '2026-04-05 12:35:25'),
('Carmen Soler', 'csoler@tech.com', '¿Estarías disponible para una breve entrevista telefónica esta semana?', '2026-04-07 15:40:40'),
('Raúl Navarro', 'raul.navarro@webdev.com', 'Muy buenos proyectos. ¿Cuánto tiempo tardaste en desarrollar el Dashboard?', '2026-04-08 20:10:55'),
('Isabel Reyes', 'ireyes@universidad.edu', 'Estamos buscando ponentes para unas jornadas tecnológicas, ¿te interesaría participar?', '2026-04-11 11:25:10'),
('Pablo Cruz', 'pcruz@ecommerce.com', 'Necesitamos optimizar nuestra tienda online, hemos visto que tienes experiencia.', '2026-04-12 08:05:35'),
('Sara Blanco', 'sara.blanco@mail.com', 'Simplemente quería dejar un mensaje para decirte que tienes un perfil muy completo. ¡Éxitos!', '2026-04-12 12:50:00'),
('Mario Garcés', 'mgarces@innovatech.com', '¿Realizas integraciones con pasarelas de pago externas?', '2026-04-12 16:15:00'),
('Elena Martín', 'emartin_seo@marketing.es', 'Hola, nos gustaría mejorar el SEO técnico de nuestra web. ¿Podemos hablar?', '2026-04-12 19:30:20'),
('Víctor Sanz', 'vsanz@devcommunity.org', 'Nos encantaría hacerte una entrevista para nuestro blog de desarrolladores.', '2026-04-13 10:00:00');