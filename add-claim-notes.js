require('dotenv').config();
const mysql = require('mysql2/promise');

async function addClaimNotesColumn() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database successfully.');

        // Add the claim_notes column to the claim table
        await connection.execute('ALTER TABLE claim ADD COLUMN claim_notes TEXT AFTER claimed_by');

        console.log('Successfully added claim_notes column to claim table.');

        await connection.end();
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addClaimNotesColumn(); 