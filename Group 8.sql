-- 1. Create the Schema
USE beauty_service_db;
show tables;
select * from users;
show create table users;

-- 2. Users Table (Core Auth)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer', 'provider') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,           -- Links to the Stylist (users table)
    image_url VARCHAR(255) NOT NULL,    -- Stores the filename (e.g., portfolio-123.jpg)
    description TEXT,                   -- The style description
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);
-- 3. Profiles Table (Extended Info)
CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    phone VARCHAR(15),
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT, -- Points directly to users.id
    category ENUM('Hair', 'Nails', 'Makeup', 'Skin Care') NOT NULL,
    title VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);
-- 5. Bookings Table (The Transaction)
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    service_id INT,
    appointment_date DATETIME NOT NULL,
    status ENUM('Pending', 'Accepted', 'Done', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- For Payments
USE beauty_service_db;

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Links the payment to the specific booking
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE
);

-- For Comments
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    customer_id INT,
    comment TEXT,
    rating INT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

USE beauty_service_db;

-- 1. Remove the old table if it exists
DROP TABLE reviews;

-- 2. Create the improved version
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    customer_id INT NOT NULL,
    comment TEXT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensures if a booking is deleted, the review is also cleaned up
    CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE,
        
    -- Ensures we know exactly which student wrote the review
    CONSTRAINT fk_review_customer FOREIGN KEY (customer_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- For Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE notifications;
ALTER TABLE users ADD COLUMN hostel_location VARCHAR(255);
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Create a table for Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 1. Remove the old, broken constraint
ALTER TABLE services DROP FOREIGN KEY services_ibfk_1;

-- 2. Link provider_id directly to the users table
ALTER TABLE services 
ADD CONSTRAINT services_ibfk_1 
FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE;


-- This updates the column to accept all the statuses your code uses
ALTER TABLE bookings MODIFY COLUMN status ENUM('Pending', 'Confirmed', 'Accepted', 'Paid', 'Completed', 'Cancelled') DEFAULT 'Pending';
ALTER TABLE bookings 
MODIFY COLUMN status ENUM('Pending', 'Confirmed', 'Accepted', 'Cancelled', 'Completed') DEFAULT 'Pending';

-- If your column is an ENUM, run this:
ALTER TABLE services 
MODIFY COLUMN category ENUM('Hair', 'Nails', 'Makeup', 'Skin Care', 'Piercing') NOT NULL;

-- OR, if your column is a VARCHAR, simply ensure the length is enough:
ALTER TABLE services 
MODIFY COLUMN category VARCHAR(50) NOT NULL;

ALTER TABLE services ADD COLUMN image_url VARCHAR(255) DEFAULT 'default-service.jpg';



-- 6. Insert Sample Data for testing your search button
INSERT INTO users (username, email, password, role) VALUES ('stylist_jane', 'jane@dekut.ac.ke', 'hashed_pass', 'provider');
INSERT INTO profiles (user_id, phone, is_verified) VALUES (1, '0712345678', 1);
INSERT INTO services (provider_id, category, title, price) VALUES (1, 'Hair', 'Knotless Braids', 1500.00);