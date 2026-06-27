# EventTix Enterprise - Event Management & Ticket Booking System

EventTix Enterprise is a full-stack web application designed to make creating, managing, and booking event tickets simple and efficient.

The application supports three user roles: Customers (who browse and book tickets), Venue Owners (who list venues and host events), and Administrators (who manage and approve listings).

---

## Features by Role

### Customers
- Browse Events: View approved events, dates, locations, ticket prices, and available seats.
- Book and Pay: Select ticket quantities and complete bookings using a simulated card payment.
- My Tickets: View and download your digital tickets, which include seat numbers and check-in status.
- Transfer Tickets: Send tickets to another user's email if you can no longer attend.
- Join Waitlists: If an event sells out, join a priority queue to secure tickets when others cancel.

### Venue Owners
- Business Profile: Register as an event organizer and set up venue details.
- Create Events: List new events, define seat capacities, set ticket prices, and booking deadlines.
- Dashboard: Track real-time ticket bookings, customer check-in statistics, and total earnings.

### Administrators
- Approve Listings: Review and approve venue profiles and event requests before they go live on the marketplace.
- Platform Control: Cancel bookings, process refunds, and suspend or blacklist accounts.
- Analytics: Monitor total tickets sold, system revenue, and database statistics.

---

## Tech Stack

- Frontend: React.js (Vite) + Tailwind CSS (Responsive and modern UI)
- Backend: Node.js + Express.js (REST API server)
- Database: MySQL 8.0 (Relational database with triggers and transactions)
- Authentication: JWT (JSON Web Tokens) & Bcrypt (Secure password hashing)

---

## How to Setup and Run the Project

### Prerequisites
Ensure you have the following installed:
1. Node.js (v18 or newer)
2. MySQL Database

---

### Step 1: Initialize the Database
1. Open your terminal and run the following command to import the database schema and sample seed data:
   ```bash
   mysql -u root -p < setup_complete.sql
   ```
2. (Optional) To import the transactions and procedures setup:
   ```bash
   mysql -u root -p EventDB < task6_transactions.sql
   ```

---

### Step 2: Start the Backend Server
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a file named .env and configure your database login details:
   ```env
   DATABASE_URL=mysql://root:your_mysql_password@localhost:3306/EventDB
   PORT=8080
   JWT_SECRET=my_super_secret_jwt_key
   ```
3. Install dependencies and start the backend:
   ```bash
   npm install
   node server.js
   ```
   *Expected Output: Database connected successfully!, Backend securely running on http://localhost:8080*

---

### Step 3: Start the Frontend App
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies and start the React app:
   ```bash
   npm install
   npm run dev
   ```
3. Open your browser and go to: http://localhost:5174/

---

## Folder Structure

- /backend - Express API server and database connection logic.
- /frontend - React user interface, page routing, and dashboard components.
- setup_complete.sql - SQL script for creating tables, triggers, and seeding initial data.
