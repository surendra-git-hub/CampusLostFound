# Campus Lost and Found System

A web-based system for managing lost and found items on a campus, built using Node.js, Express, EJS, and MySQL.

## Features

- User authentication and authorization
- Report lost items
- Report found items
- Claim system for matching lost and found items
- Admin dashboard for managing users, items, and claims
- Search functionality for lost and found items
- Responsive design for mobile and desktop

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: EJS (Embedded JavaScript templates)
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Bootstrap 5 with custom CSS
- **File Uploads**: Multer

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm (Node Package Manager)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd campus-lost-found
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

- Create a MySQL database named `campus_lost_found`
- Run the SQL script in `db/init.sql` to create the database schema and tables:

```bash
mysql -u root -p < db/init.sql
```

### 4. Configure environment variables

Create a `.env` file in the root directory with the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_lost_found

# Server Configuration
PORT=3000

# JWT Secret
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

Replace `your_password` with your MySQL password and `your_secret_key` with a strong secret key for JWT.

### 5. Create the uploads directory

```bash
mkdir -p public/uploads
```

### 6. Start the server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The application will be available at http://localhost:3000

## Default Admin Account

Username: admin
Password: admin123

## Project Structure

```
campus-lost-found/
├── db/                  # Database scripts
├── middleware/          # Express middleware
├── models/              # Database models
├── controllers/         # Route controllers
├── routes/              # Express routes
├── public/              # Static files
│   ├── css/             # CSS files
│   ├── js/              # JavaScript files
│   └── uploads/         # Uploaded files
├── views/               # EJS templates
│   └── partials/        # EJS partial templates
├── .env                 # Environment variables
├── server.js            # Main application file
├── package.json         # Project dependencies
└── README.md            # Project documentation
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - User login
- `GET /auth/logout` - User logout

### Lost Items
- `GET /lost-items` - Get all lost items
- `GET /lost-items/:id` - Get a specific lost item
- `POST /lost-items` - Create a new lost item
- `PUT /lost-items/:id` - Update a lost item
- `DELETE /lost-items/:id` - Delete a lost item

### Found Items
- `GET /found-items` - Get all found items
- `GET /found-items/:id` - Get a specific found item
- `POST /found-items` - Create a new found item
- `PUT /found-items/:id` - Update a found item
- `DELETE /found-items/:id` - Delete a found item

### Claims
- `GET /claims` - Get all claims (admin only)
- `GET /claims/:id` - Get a specific claim
- `POST /claims` - Create a new claim
- `POST /claims/:id/approve` - Approve a claim (admin only)
- `POST /claims/:id/reject` - Reject a claim (admin only)
- `POST /claims/:id/cancel` - Cancel a claim

### Users
- `GET /users/dashboard` - User dashboard
- `GET /users/profile` - User profile
- `POST /users/profile` - Update user profile

### Admin
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/users` - Manage users
- `GET /admin/lost-items` - Manage lost items
- `GET /admin/found-items` - Manage found items
- `GET /admin/claims` - Manage claims

## License

This project is licensed under the MIT License. 