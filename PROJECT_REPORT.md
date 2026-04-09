# Event Management & Ticket Booking System
**Final Project Report & Implementation Summary**

## Architecture Overview
This project is a full-stack Enterprise Web Application built using an advanced three-tier architecture, emphasizing strict Database Concurrency and Data Integrity.
- **Frontend Layer**: React.js + Vite + Tailwind CSS
- **Backend Layer**: Node.js + Express
- **Database Layer**: MySQL (EventDB)

---

## 1. Multi-Role Authorization System
The system authenticates users using bcrypt hashing and JWT tokens, splitting the entire interface into three distinct environments based on the user's `Role`:
* **Customer Panel**: Browsing marketplace, initiating strict transactional ticket bookings, securely transmitting mock payments, and viewing auto-generated Digital Tickets.
* **Owner Dashboard**: An exclusive portal for Venue Businessmen. Allows payment of the ₹5000 Business Setup Fee, and dynamic uploading of Property/Event listings perfectly mapped to the database's `Venue` constraints.
* **Admin Control Panel**: Supreme management portal. Validates and securely approves pending Business Applications from Owners so their properties can appear on the market.

## 2. Advanced Security Mechanisms
* **Bot-Defense System**: A custom Math Verification CAPTCHA protects the Application API from robotic login/registration attempts.
* **Data Validations**: Strict Regex enforcement guarantees 100% valid Email formats and Enterprise Password standards (8+ chars, uppercase, number, symbol) before any data is authorized for MySQL processing.

## 3. Database Constraints & Triggers (Core Business Logic)
The majority of the ticket-generation logic was abstracted straight into the Database Layer to eliminate application-side errors:
* **`After_Payment_Success` Trigger**: Automatically decrements the `Available_Seats` in the `Event` table and physically inserts rows into the `Ticket` table the nanosecond a User Payment is processed.
* **`Update_Available_Seats` Constraint**: Mathematically guarantees no property can ever be overbooked beyond its maximal capacity.
* **`After_Booking_Cancellation` Trigger**: Immediately intercepts canceled status updates, permanently deletes the corresponding tickets, mathematically refunds the payment amount, and safely restores the hall's available seat capacity constraints.

## 4. Race Condition Concurrency Protocols
* **ACID Transactions**: Implemented `START TRANSACTION` loops directly alongside Express Routing.
* **Table Locking**: Utilizing `FOR UPDATE` read-locks natively during the booking process. If thousands of users attempt to purchase the final seat simultaneously, the Node.js application will mathematically force a sequential database validation line, ensuring 100% atomic integrity.
