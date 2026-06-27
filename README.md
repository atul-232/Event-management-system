# EventTix Enterprise - Event Management & Ticket Booking System

**Live Demo:** [https://event-management-system-kyiz.vercel.app/](https://event-management-system-kyiz.vercel.app/)

*Note: Free-tier servers automatically go to sleep after 15 minutes of inactivity. If the live link fails to load or takes a long time to respond, the backend is likely waking up from a cold start. You can run the application locally on your computer for a faster experience by following the local setup guide below.*

---

## About the Project

EventTix Enterprise is a full-stack web application designed for event management and ticket booking. It features a complete transactional flow from listing events to booking tickets and checking in.

The system supports three user roles:
1. **Customers:** Browse events, book tickets using simulated payments, download tickets with seat numbers, transfer tickets to friends, or join waitlists if an event is sold out.
2. **Venue Owners:** Register business profiles, pay setup fees, list venues, create events, and monitor real-time ticket sales and check-in stats.
3. **Administrators:** Review and approve business applications, approve or reject new events, cancel bookings, issue refunds, and monitor platform revenue analytics.

---

## Tech Stack

- **Frontend:** React.js (Vite) + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Database:** MySQL 8.0 (Triggers and transaction isolation levels)
- **Authentication:** JWT (JSON Web Tokens) & Bcrypt

---

## Local Setup and Installation

### Prerequisites
Make sure you have the following installed on your computer:
1. **Node.js** (v18 or newer)
2. **MySQL Database**

### Step 1: Set Up the Local Database
1. Open your MySQL command line or GUI client (like DBeaver or MySQL Workbench).
2. Run the following command to create the database tables and structure:
   ```bash
   mysql -u root -p < setup_complete.sql
   ```
3. (Optional) Run the transactions script if you want to test procedures and locks:
   ```bash
   mysql -u root -p EventDB < task6_transactions.sql
   ```

### Step 2: Configure and Start the Backend
1. Open your terminal and go to the backend directory:
   ```bash
   cd backend
   ```
2. Create a file named `.env` in this directory:
   ```env
   DATABASE_URL=mysql://root:your_mysql_password@localhost:3306/EventDB
   PORT=8080
   JWT_SECRET=your_jwt_secret_key
   ```
   *(Make sure to replace "your_mysql_password" with your actual local MySQL root password).*
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```
   *Expected Output: "Database connected successfully!" and "Backend securely running on http://localhost:8080"*

### Step 3: Configure and Start the Frontend
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   ```
4. Open the link in your browser: `http://localhost:5174/`

---

## How to Log In and Use the App

You can test the application using the pre-seeded default accounts below:

### 1. Log In as Administrator
* **Role:** Manage system listings, approve organizers, and view global analytics.
* **Email:** `admin@eventtix.com`
* **Password:** `Admin@123`

### 2. Log In as Venue Owner
* **Role:** Register properties, post events, and review check-in statistics.
* **Email:** `john@owner.com`
* **Password:** `Admin@123`

### 3. Log In / Register as Customer
* **Role:** Book tickets and join waitlists.
* **Access:** You can sign up with a new account directly on the **Register** page of the app.
