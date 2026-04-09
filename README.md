# 🎫 EventTix Enterprise — Event Management & Ticket Booking System

A full-stack event management platform with Admin, Owner, and Customer roles.

---

## 🛠 Prerequisites (Install These First)

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | v18 or above | https://nodejs.org |
| **MySQL** | v8.0+ | https://dev.mysql.com/downloads/mysql/ |

After installing, verify by running:
```bash
node -v
npm -v
mysql --version
```

---

## 🚀 Step-by-Step Setup

### Step 1: Set Up the Database

1. **Start MySQL** (if not already running):
   - **Windows**: Open Services → Start *MySQL80*
   - **Mac**: `brew services start mysql` or start from System Preferences
   - **Linux**: `sudo systemctl start mysql`

2. **Import the database schema**:
   ```bash
   mysql -u root -p < Event_Mangement.sql
   ```
   Enter your MySQL root password when prompted.  
   This creates the `EventDB` database with all tables, triggers, and indexes.

3. **Also import the transactions file** (optional, for stored procedures):
   ```bash
   mysql -u root -p EventDB < task6_transactions.sql
   ```

---

### Step 2: Configure Database Credentials

Edit the file `backend/db.js` and update the password to match **your** MySQL root password:

```js
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'YOUR_MYSQL_PASSWORD',  // ← CHANGE THIS
    database: 'EventDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
```

---

### Step 3: Start the Backend Server

Open a terminal and run:
```bash
cd backend
npm install
node server.js
```

You should see:
```
Backend securely running on http://localhost:8080
```

> ⚠️ **Keep this terminal open.** The backend must stay running.

---

### Step 4: Start the Frontend

Open a **second/new terminal** and run:
```bash
cd frontend
npm install
npm run dev
```

You should see:
```
  VITE vx.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

**Open http://localhost:5173 in your browser** 🎉

---

## 📋 Quick Reference

| Component    | Command             | URL                        |
|-------------|---------------------|----------------------------|
| **Database** | `mysql -u root -p < Event_Mangement.sql` | — |
| **Backend**  | `node server.js`    | http://localhost:8080       |
| **Frontend** | `npm run dev`       | http://localhost:5173       |

---

## 👤 First Time Usage

1. The app starts with **no users logged in**
2. **Register** a new account (Customer or Owner role)
3. To create an **Admin** account, insert directly into the database:
   ```sql
   -- Run this in MySQL to create an admin (password: Admin@123)
   INSERT INTO Users (UserId, Name, Email, Phone_Number, Password, Role)
   VALUES (1, 'Admin', 'admin@eventtix.com', '9999999999',
   '$2b$10$YourBcryptHashHere', 'ADMIN');
   ```
   Or use the pre-seeded admin if the SQL file includes one.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ER_ACCESS_DENIED_ERROR` | Wrong MySQL password in `backend/db.js` |
| `ECONNREFUSED` on backend | MySQL is not running. Start the MySQL service. |
| Frontend shows network error | Backend is not running. Start it with `node server.js` |
| Port 8080 already in use | Kill the process: `lsof -i :8080` then `kill -9 <PID>` |
| `npm install` fails | Try deleting `node_modules` and `package-lock.json`, then retry |

---

## 📁 Project Structure

```
group_109/
├── Event_Mangement.sql        # Database schema + triggers
├── task6_transactions.sql     # Transaction procedures
├── README.md                  # This file
├── backend/
│   ├── db.js                  # MySQL connection config
│   ├── server.js              # Express API server (all routes)
│   └── package.json           # Backend dependencies
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main app with routing
    │   ├── pages/             # Login, Register, Dashboards, etc.
    │   ├── components/        # Reusable UI components
    │   └── services/api.js    # Axios API client
    ├── index.html
    └── package.json           # Frontend dependencies
```

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Node.js + Express 5
- **Database**: MySQL 8 with Triggers & Stored Procedures
- **Auth**: JWT + bcrypt
