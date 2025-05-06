-- Drop database if exists and create a new one
DROP DATABASE IF EXISTS campus_lost_found;
CREATE DATABASE campus_lost_found;
USE campus_lost_found;

-- Admin table
CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'admin'
);

-- User table
CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20)
);

-- Lost item table
CREATE TABLE lost_item (
    lost_item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    date_lost DATE,
    location_lost VARCHAR(100),
    reported_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE SET NULL
);

-- Found item table
CREATE TABLE found_item (
    found_item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    date_found DATE,
    location_found VARCHAR(100),
    found_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'unclaimed',
    image_url VARCHAR(255)
);

-- Claims table
CREATE TABLE claim (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT,
    found_item_id INT,
    user_id INT,
    claimed_by VARCHAR(100),
    claim_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (lost_item_id) REFERENCES lost_item(lost_item_id) ON DELETE SET NULL,
    FOREIGN KEY (found_item_id) REFERENCES found_item(found_item_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE SET NULL
);

-- Admin manages users relationship
CREATE TABLE admin_manages_user (
    admin_id INT,
    user_id INT,
    PRIMARY KEY (admin_id, user_id),
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- Admin manages found items relationship
CREATE TABLE admin_manages_found_item (
    admin_id INT,
    found_item_id INT,
    PRIMARY KEY (admin_id, found_item_id),
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE,
    FOREIGN KEY (found_item_id) REFERENCES found_item(found_item_id) ON DELETE CASCADE
);

-- Admin approves claims relationship
CREATE TABLE admin_approves_claim (
    admin_id INT,
    claim_id INT,
    approval_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_id, claim_id),
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claim(claim_id) ON DELETE CASCADE
);

-- Insert default admin
INSERT INTO admin (name, email, username, password, role) 
VALUES ('Admin', 'admin@campus.edu', 'admin', '$2a$10$xVqYLWB9iRZpPb3jcTkyAO8pnGV2xYOl9VUjkg5shXLJvnLFevg9S', 'super_admin');
-- Default password is 'admin123' 