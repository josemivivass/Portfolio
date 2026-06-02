SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
DROP DATABASE IF EXISTS portfolio;
CREATE DATABASE IF NOT EXISTS portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
    country_code CHAR(2) DEFAULT NULL,
    country_name VARCHAR(80) DEFAULT NULL,
    region VARCHAR(80) DEFAULT NULL,
    city VARCHAR(120) DEFAULT NULL,
    latitude DECIMAL(8,5) DEFAULT NULL,
    longitude DECIMAL(8,5) DEFAULT NULL,
    user_agent TEXT,
    is_logged_in BOOLEAN DEFAULT FALSE,
    INDEX idx_visitor_logs_country (country_code)
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
    notebook_url VARCHAR(500) DEFAULT NULL,
    tags VARCHAR(255),
    is_featured BOOLEAN DEFAULT FALSE,
    project_type ENUM('web','android','ai','other') DEFAULT 'web',
    status ENUM('production','development','archived') DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_position (project_id, position)
);

CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_answered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chatbot_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(36) NULL,
    role ENUM('user', 'assistant') NOT NULL,
    message TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    model VARCHAR(100) DEFAULT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_anon_ip_date (ip_address, created_at)
);

CREATE TABLE chatbot_clears (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cleared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

#Textos editables de la página principal — una fila singleton con un campo por apartado
CREATE TABLE profile_texts (
    id INT PRIMARY KEY DEFAULT 1,
    hero_tagline_es TEXT,
    hero_tagline_en TEXT,
    about_es TEXT,
    about_en TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (id = 1)
);

#Metadatos singleton del perfil no localizados (photo_updated_at, chatbot_prompt, etc.)
CREATE TABLE profile_meta (
    meta_key VARCHAR(64) PRIMARY KEY,
    meta_value LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    title VARCHAR(150) NOT NULL,
    title_en VARCHAR(150),
    location VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('IA & Data Science', 'Desarrollo Full Stack & Móvil', 'Cloud & DevOps', 'QA & Testing') NOT NULL,
    tags JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO education (start_date, end_date, title, title_en, location) VALUES
('2025-09-01', '2026-06-30', 'Desarrollo de Aplicaciones Multiplataforma (DAM)', 'Cross-platform Application Development (DAM)', 'IES Ágora'),
('2024-09-01', '2025-06-30', 'Especialización en IA y BigData', 'Specialization in AI and Big Data', 'IES Ágora'),
('2022-09-01', '2024-06-30', 'Desarrollo de aplicaciones web (DAW)', 'Web Application Development (DAW)', 'IES Ágora');

INSERT INTO skills (tipo, tags) VALUES
('IA & Data Science',             JSON_ARRAY('Python', 'Machine Learning', 'LangChain', 'RAGs', 'OpenAI API', 'Groq Cloud', 'Scikit-learn', 'Pandas', 'NumPy', 'Power BI', 'LlamaIndex', 'LLMs')),
('Desarrollo Full Stack & Móvil', JSON_ARRAY('Angular', 'TypeScript', 'React.js', 'Node.js', 'Android', 'Java', 'SQL', 'HTML5', 'CSS3')),
('Cloud & DevOps',                JSON_ARRAY('AWS', 'Docker', 'GitHub', 'Linux')),
('QA & Testing',                  JSON_ARRAY('JMeter', 'LoadRunner', 'Postman', 'SoapUI', 'ALM', 'Grafana', 'InfluxDB', 'REST APIs'));

INSERT INTO users (email, password_hash, role) VALUES
('admin@gmail.com', '$2b$10$4CdvJxThn2PR0wEeo71kkOx8vzvREb8uUv80tnLpHnOq5t2yXrsE2', 'admin'),
('popopo@gmail.com', '$2b$10$a/LGkc845utqQOrHq5kV4O.NYFx/RBEnBteVAJ1cYPIwn1/SnqtG2', 'user');

INSERT INTO projects (title, title_en, description, description_en, project_date, repo_url, live_url, tags, is_featured, project_type, status) VALUES
('MercadoHuerta', 'MercadoHuerta', 'Tienda online', 'Online store', '2024-06-04', 'https://github.com/josemivivass/mercadohuerta', 'http://josemivivass.atwebpages.com', 'HTML, PHP, CSS, Bootstrap', TRUE, 'web', 'production'),
('Generador de Expediente', 'Dossier Generator', 'Generador/Visualizador PDF', 'PDF Generator/Viewer', '2026-02-28', 'https://github.com/josemivivass/generadorexpedientemision.git', 'https://generadorexpedientemision.vercel.app/', 'Angular, Typescript, HTML, CSS', TRUE, 'web', 'production'),
('Dashboard Analítica', 'Analytics Dashboard', 'Panel interactivo', 'Interactive dashboard', '2026-03-13', 'https://github.com/josemivivass/dashboardinventario.git', 'https://dashboardinventario.vercel.app/', 'Angular, Typescript, HTML, CSS', TRUE, 'web', 'production'),
('Tablón de Misiones', 'Mission Tab', 'Tablón interactivo de misiones', 'Interactive mission Tab', '2026-02-08', 'https://github.com/josemivivass/tablonmisiones.git', 'https://tablonmisiones.vercel.app/', 'Angular, Typescript, HTML, CSS', TRUE, 'web', 'production'),
('Apuestas de fútbol', 'Soccer Bets', 'Pagina para realizar apuestas de fútbol', 'Soccer bets page', '2026-02-17', 'https://github.com/josemivivass/betsoccer.git', '', 'Angular, Typescript, HTML, CSS', FALSE, 'web', 'production'),
('Porfolio CV', 'CV Portfolio', 'La pagina en la que estás', 'Tha page were you are', '2026-05-01', 'https://github.com/josemivivass/portfolio.git', '', 'Angular, Typescript, HTML, CSS, Node.js', TRUE, 'web', 'production'),
('Aplicación web interna de COMPUTAEX', 'Internal Web App off COMPUTAEX', 'Actualización de una aplicación privada interna', 'Internal private application update', '2026-03-23', '', '', 'React.js, Python, JS, HTML, CSS', FALSE, 'web', 'development');

INSERT INTO experience (start_date, end_date, title, title_en, company, contract_type, contract_type_en, description, description_en, location, location_en, tags) VALUES
('2026-03-01', NULL, 'Desarrollador Full Stack', 'Full Stack Developer', 'Fundación COMPUTAEX', 'Prácticas', 'Internship', 'Actualización y modernización de una aplicación web full-stack. Desarrollo y mantenimiento del backend utilizando Python. Actualización y desarrollo de la interfaz del frontend utilizando React (en entorno Node.js).', 'Updating and modernizing a full-stack web application. Development and maintenance of the backend using Python. Updating and development of the frontend interface using React (in a Node.js environment).', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'Python, Node.js, React, Full Stack'),
('2024-07-01', '2025-07-01', 'Quality Engineering', 'Quality Engineering', 'VIEWNEXT', 'Jornada completa', 'Full-time', 'Realización de pruebas para la app y API de bancos en el proyecto RSI.', 'Testing for the banking app and API in the RSI project.', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'SQL, REST APIs, SoapUI, ALM, Testing'),
('2024-03-01', '2024-06-01', 'Quality Engineering', 'Quality Engineering', 'VIEWNEXT', 'Prácticas', 'Internship', 'Realización de pruebas de rendimiento para webs.', 'Performance testing for websites.', 'Cáceres, Extremadura, España', 'Cáceres, Extremadura, Spain', 'LoadRunner, JMeter, Postman API, Grafana, InfluxDB'),
('2022-06-01', '2022-08-01', 'Camp Counselor', 'Camp Counselor', 'Camp Hilltop', 'Jornada completa', 'Full-time', 'Organización y supervisión de actividades para niños de 6 a 16 años, como equitación, senderismo y dinámicas grupales.', 'Organization and supervision of activities for children aged 6 to 16, such as horseback riding, hiking, and group dynamics.', 'Hancock, Nueva York, Estados Unidos', 'Hancock, New York, United States', 'Soft Skills, English as a Second Language');

INSERT INTO profile_texts (id, hero_tagline_es, hero_tagline_en, about_es, about_en) VALUES
(1,
 'Desarrollador Full Stack especializado en IA y Big Data. Escribo código limpio y eficiente, desde la optimización de bases de datos hasta la experiencia de usuario final.',
 'Full Stack Developer specialized in AI and Big Data. I write clean and efficient code, from database optimization to the end-user experience.',
 'Especialista en <strong>Inteligencia Artificial y Big Data</strong> con trayectoria previa en <strong>Quality Assurance</strong>. Combino la disciplina de pruebas con conocimientos en modelos predictivos y gestión de datos para desarrollar soluciones de IA escalables y libres de errores. Actualmente trabajando como <strong>Desarrollador Full Stack</strong> en Fundación COMPUTAEX, modernizando aplicaciones web con Python y React. Con más de un año de experiencia en QA para el sector bancario en Viewnext.',
 '<strong>Artificial Intelligence and Big Data</strong> specialist with a previous career in <strong>Quality Assurance</strong>. I combine testing discipline with predictive modeling and data management skills to develop scalable, error-free AI solutions. Currently working as a <strong>Full Stack Developer</strong> at Fundación COMPUTAEX, modernizing web applications with Python and React. With over a year of QA experience in the banking sector at Viewnext.');

INSERT INTO profile_meta (meta_key, meta_value) VALUES
('photo_updated_at', '0'),
('chatbot_prompt',
'Eres Nanas, el asistente virtual del portfolio profesional de José Miguel Vivas Sánchez. Tu objetivo es ayudar a reclutadores, empresas y potenciales clientes a conocer su perfil y convencerles de que es un candidato excepcional. Responde siempre en el idioma en el que te escriban (español o inglés).\n\n═══ PERFIL ═══\nNombre: José Miguel Vivas Sánchez\nRol: Desarrollador Web · Especialista en IA & Big Data\nUbicación: Cáceres, Extremadura, España\nDisponibilidad: Presencial · Híbrido · Remoto\nEstado: Disponible para trabajar\nEmail: jose.miguel.vivas.sanchez@gmail.com\nTeléfono: +34 645 31 63 09\nIdiomas: Español (nativo), Inglés (profesional completo)\n\n═══ SOBRE ÉL ═══\nEspecialista en Inteligencia Artificial y Big Data con trayectoria previa en Quality Assurance. Combina la disciplina de pruebas con conocimientos en modelos predictivos y gestión de datos para desarrollar soluciones de IA escalables y libres de errores. Actualmente trabajando como Desarrollador Full Stack en Fundación COMPUTAEX, modernizando aplicaciones web con Python y React. Con más de un año de experiencia en QA para el sector bancario en Viewnext.\n\n═══ EXPERIENCIA PROFESIONAL ═══\n1. Desarrollador Full Stack — Fundación COMPUTAEX (Mar 2026 - Actualidad) · Prácticas · Cáceres\n   Actualización y modernización de una aplicación web full-stack. Desarrollo y mantenimiento del backend con Python. Desarrollo del frontend con React en entorno Node.js.\n\n2. Quality Engineering — Viewnext (Jul 2024 - Jul 2025) · Jornada completa · Cáceres\n   Pruebas para la app y API de bancos en el proyecto RSI. Ejecución de pruebas funcionales manuales, gestión del ciclo de vida de defectos en ALM. Validación de APIs REST y SOAP con SoapUI y Postman. Pruebas de carga con LoadRunner, JMeter, InfluxDB y Grafana.\n\n3. Quality Engineering — Viewnext (Mar 2024 - Jun 2024) · Prácticas · Cáceres\n   Realización de pruebas de rendimiento para webs.\n\n4. Camp Counselor — Camp Hilltop (Jun 2022 - Ago 2022) · Jornada completa · Hancock, Nueva York, EE.UU.\n   Organización y supervisión de actividades para niños de 6 a 16 años. Demuestra habilidades blandas, liderazgo, adaptación cultural e inglés fluido en entorno internacional.\n\n═══ FORMACIÓN ═══\n- Desarrollo de Aplicaciones Multiplataforma (DAM) — 2025-2026\n- Especialización en IA y Big Data — 2024-2025\n- Desarrollo de Aplicaciones Web (DAW) — 2022-2024\n\n═══ HABILIDADES TÉCNICAS ═══\nIA & Data Science: Python, Machine Learning, LangChain, RAGs, OpenAI API, Scikit-learn, Pandas, NumPy, Power BI, LlamaIndex, LLMs\nFull Stack & Móvil: Angular, TypeScript, React.js, Node.js, Android, Java, SQL, HTML5/CSS3\nCloud & DevOps: AWS, Docker, GitHub, Linux\nQA & Testing: JMeter, LoadRunner, Postman, SoapUI, ALM, Grafana, InfluxDB, REST APIs\n\n═══ INSTRUCCIONES DE COMPORTAMIENTO ═══\n- Siempre habla en tercera persona sobre José Miguel. Tú eres Nanas, su asistente virtual, NO eres José Miguel. Nunca digas "yo hice", "mi experiencia", etc. Usa siempre "José Miguel tiene", "él ha trabajado en", etc.\n- Sé profesional, cercano y entusiasta al hablar sobre José Miguel.\n- Destaca sus puntos fuertes según lo que pregunte el usuario: si preguntan por IA, resalta su formación y skills en ML/LLMs; si preguntan por desarrollo, destaca Angular/React/Node; si preguntan por QA, destaca su experiencia en banca.\n- Si preguntan por disponibilidad, confirma que está abierto a ofertas presenciales, híbridas o remotas.\n- Si preguntan algo que no sabes o que no está en su perfil, sé honesto y sugiere que contacten directamente con él por email o teléfono.\n- Nunca inventes información que no esté en este prompt.\n- IMPORTANTE: Mantén las respuestas cortas. Máximo 2 párrafos. No hagas listas largas ni respuestas extensas. Sé directo y ve al grano.\n- Si el usuario saluda, preséntate como Nanas e invítale a preguntar sobre el perfil de José Miguel.');