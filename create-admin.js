require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database successfully.');

        // Admin credentials
        const adminEmail = 'admin@campuslostfound.com';
        const adminUsername = 'admin';
        const adminPassword = 'admin123'; // This will be hashed
        const adminName = 'System Administrator';

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Check if admin table exists, if not create it
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin (
        admin_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Check if admin already exists
        const [existingAdmins] = await connection.execute(
            'SELECT * FROM admin WHERE email = ? OR username = ?',
            [adminEmail, adminUsername]
        );

        if (existingAdmins.length > 0) {
            console.log('Admin user already exists. Updating password...');

            // Update existing admin
            await connection.execute(
                'UPDATE admin SET password = ? WHERE email = ? OR username = ?',
                [hashedPassword, adminEmail, adminUsername]
            );

            console.log('Admin password updated successfully.');
        } else {
            // Insert new admin
            await connection.execute(
                'INSERT INTO admin (name, email, username, password) VALUES (?, ?, ?, ?)',
                [adminName, adminEmail, adminUsername, hashedPassword]
            );

            console.log('Admin user created successfully.');
        }

        console.log(`
    =============================================
    Admin Account Details:
    Email: ${adminEmail}
    Username: ${adminUsername}
    Password: ${adminPassword} (unhashed)
    =============================================
    `);

        await connection.end();
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createAdminUser(); 