require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const DB_URL_STRING = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL || "mysql://root:ysHjhTaXKemgPEAGGkEvXXrPeiDZyEaz@mainline.proxy.rlwy.net:23066/railway";

// Robust manual parsing
const dbUrl = new URL(DB_URL_STRING);
const poolConfig = {
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace("/", ""),
    port: parseInt(dbUrl.port) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000 // Higher timeout for cross-platform connections
};

console.log("-----------------------------------------");
console.log(`📡 DB Connection Source: ${process.env.MYSQL_PUBLIC_URL ? 'MYSQL_PUBLIC_URL' : (process.env.DATABASE_URL ? 'DATABASE_URL' : 'FALLBACK')}`);
console.log(`📡 Host: ${poolConfig.host}`);
console.log(`📡 Port: ${poolConfig.port}`);
console.log(`📡 User: ${poolConfig.user}`);
console.log(`📡 Database: ${poolConfig.database}`);
console.log("-----------------------------------------");

const pool = mysql.createPool(poolConfig);




async function testDB() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully!");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
}
testDB();

const app = express();
const PORT = process.env.PORT || 10000;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt';

app.use(cors());
app.use(express.json());

// === AUTH CONTROLLER ===
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, role, address, age, gender, proofId, country } = req.body;
        // SECURITY: Only one Admin exists. Nobody can register as ADMIN.
        if (role === 'ADMIN') return res.status(403).json({ success: false, error: 'Admin registration is forbidden.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: "Invalid Email Format" });
        if (!/(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?&]).{8,}/.test(password)) return res.status(400).json({ success: false, error: "Weak Password." });
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = Math.floor(Math.random() * 1000000);
        await pool.execute(
            'INSERT INTO Users (UserId, Name, Email, Phone_Number, Password, Role, Address, Age, Gender, Proof_Id, Country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, name, email, phone, hashedPassword, role || 'CUSTOMER', address || null, age || null, gender || null, proofId || null, country || null]
        );
        res.json({ success: true, message: 'User registered successfully!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Email already exists.' });
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin: Delete User (Completely Removes Account & cascades bookings)
app.delete('/api/admin/user/:userId', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Users WHERE UserId = ? AND Role != "ADMIN"', [req.params.userId]);
        res.json({ success: true, message: 'User and all related data completely erased.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Update User Profile
app.put('/api/admin/user/:userId', async (req, res) => {
    try {
        const { Name, Email, Phone_Number, Address, Age, Gender, Proof_Id, Country } = req.body;
        await pool.execute(
            'UPDATE Users SET Name=?, Email=?, Phone_Number=?, Address=?, Age=?, Gender=?, Proof_Id=?, Country=? WHERE UserId=?',
            [Name, Email, Phone_Number, Address, Age, Gender, Proof_Id, Country, req.params.userId]
        );
        res.json({ success: true, message: 'Profile Updated!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM Users WHERE Email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ success: false, error: 'User not found' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.Password);
        if (!match && password !== user.Password) return res.status(401).json({ success: false, error: 'Invalid password' });
        const token = jwt.sign({ userId: user.UserId, role: user.Role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, user: { name: user.Name, role: user.Role, userId: user.UserId } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// === ADMIN CONTROLLERS (Full Power)
// ============================================================

// Admin: All Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const query = `
            SELECT u.UserId, u.Name, u.Email, u.Phone_Number, u.Role, 
                   u.Address, u.Age, u.Gender, u.Proof_Id, u.Country,
                   COALESCE(SUM(CASE WHEN b.Booking_Status = 'CONFIRMED' THEN b.Quantity ELSE 0 END), 0) as TotalTickets
            FROM Users u
            LEFT JOIN Booking b ON u.UserId = b.UserId
            GROUP BY u.UserId
            ORDER BY u.Role ASC
        `;
        const [users] = await pool.execute(query);
        res.json({ success: true, users });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Get one user's full activity
app.get('/api/admin/user-activity/:userId', async (req, res) => {
    try {
        const uid = req.params.userId;
        const [bookings] = await pool.execute(
            `SELECT b.Booking_Id, b.Booking_Date, b.Booking_Status, b.Quantity,
                    e.Event_Name, e.Event_Type, e.Event_Date
             FROM Booking b JOIN Event e ON b.Event_Id = e.Event_Id
             WHERE b.UserId = ? ORDER BY b.Booking_Date DESC`, [uid]);
        const [payments] = await pool.execute(
            `SELECT p.Payment_Id, p.Transaction_Id, p.Amount, p.Payment_Status,
                    e.Event_Name
             FROM Payment p JOIN Booking b ON p.Booking_Id = b.Booking_Id
             JOIN Event e ON b.Event_Id = e.Event_Id
             WHERE b.UserId = ? ORDER BY p.Payment_Id DESC`, [uid]);
        res.json({ success: true, bookings, payments });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: All Business Accounts
app.get('/api/admin/businesses', async (req, res) => {
    try {
        const [businesses] = await pool.execute(
            `SELECT ba.*, u.Name as OwnerName, u.Email as OwnerEmail 
             FROM Business_Account ba JOIN Users u ON ba.UserId = u.UserId 
             ORDER BY ba.Approval_Status ASC`);
        res.json({ success: true, businesses });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Approve Business
app.post('/api/admin/approve-business', async (req, res) => {
    try {
        const { businessId } = req.body;
        await pool.execute('UPDATE Business_Account SET Approval_Status = "APPROVED" WHERE Business_Id = ?', [businessId]);
        res.json({ success: true, message: 'Business Account Approved' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin or Owner: Extend booking deadline
app.post('/api/events/extend-deadline', async (req, res) => {
    try {
        const { eventId, newDeadline } = req.body;
        await pool.execute('UPDATE Event SET Booking_Deadline = ? WHERE Event_Id = ?', [newDeadline, eventId]);
        res.json({ success: true, message: 'Booking deadline extended.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin or Owner: Update seat capacity
app.post('/api/events/update-seats', async (req, res) => {
    try {
        const { eventId, newTotal } = req.body;
        const [[event]] = await pool.execute('SELECT Total_Seats, Available_Seats FROM Event WHERE Event_Id = ?', [eventId]);
        if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
        const booked = event.Total_Seats - event.Available_Seats;
        if (newTotal < booked) return res.status(400).json({ success: false, error: `Cannot reduce below ${booked} (already booked).` });
        const newAvailable = newTotal - booked;
        await pool.execute('UPDATE Event SET Total_Seats = ?, Available_Seats = ? WHERE Event_Id = ?', [newTotal, newAvailable, eventId]);
        res.json({ success: true, message: `Seats updated.` });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin or Owner: Update commission rate per ticket
app.post('/api/events/update-commission', async (req, res) => {
    try {
        const { eventId, commissionRate } = req.body;
        await pool.execute('UPDATE Event SET Commission_Rate = ? WHERE Event_Id = ?', [commissionRate, eventId]);
        res.json({ success: true, message: `Commission updated to ₹${commissionRate}/ticket` });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Public: All Approved Events
app.get('/api/events', async (req, res) => {
    try {
        const [events] = await pool.execute(
            `SELECT e.*, v.Venue_Name, v.Location 
             FROM Event e
             JOIN Venue v ON e.Venue_Id = v.Venue_Id
             WHERE e.Approval_Status = 'APPROVED'
             ORDER BY e.Event_Date ASC`
        );
        res.json({ success: true, events });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: All Events with Venue & Owner details
app.get('/api/admin/events', async (req, res) => {
    try {
        const [events] = await pool.execute(
            `SELECT e.*, v.Venue_Name, v.Location, v.Capacity, ba.Business_Id, u.Name as OwnerName
             FROM Event e
             JOIN Venue v ON e.Venue_Id = v.Venue_Id
             JOIN Business_Account ba ON v.Business_Id = ba.Business_Id
             JOIN Users u ON ba.UserId = u.UserId
             ORDER BY e.Event_Date DESC`);
        res.json({ success: true, events });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Approve Event
app.post('/api/admin/events/approve', async (req, res) => {
    try {
        await pool.execute('UPDATE Event SET Approval_Status = "APPROVED" WHERE Event_Id = ?', [req.body.eventId]);
        res.json({ success: true, message: 'Event Approved and published.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Reject Event (Mark as REJECTED)
app.post('/api/admin/events/reject', async (req, res) => {
    try {
        await pool.execute('UPDATE Event SET Approval_Status = "REJECTED" WHERE Event_Id = ?', [req.body.eventId]);
        res.json({ success: true, message: 'Event Rejected.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Remove Event Completely (Cleanup)
app.delete('/api/admin/events/:eventId', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Event WHERE Event_Id = ?', [req.params.eventId]);
        res.json({ success: true, message: 'Event completely deleted.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: All Payments with Booking + User details
app.get('/api/admin/payments', async (req, res) => {
    try {
        const [payments] = await pool.execute(
            `SELECT p.*, b.Booking_Status, b.Quantity, b.UserId, u.Name as UserName, u.Email as UserEmail,
                    e.Event_Name, e.Event_Type
             FROM Payment p
             JOIN Booking b ON p.Booking_Id = b.Booking_Id
             JOIN Users u ON b.UserId = u.UserId
             JOIN Event e ON b.Event_Id = e.Event_Id
             ORDER BY p.Payment_Id DESC`);
        res.json({ success: true, payments });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: All Bookings with member details
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const [bookings] = await pool.execute(
            `SELECT b.*, u.Name as UserName, u.Email as UserEmail, u.Phone_Number,
                    e.Event_Name, e.Event_Type, e.Event_Date
             FROM Booking b
             JOIN Users u ON b.UserId = u.UserId
             JOIN Event e ON b.Event_Id = e.Event_Id
             ORDER BY b.Booking_Date DESC`);
        // Attach tickets to each booking
        for (let i = 0; i < bookings.length; i++) {
            const [tickets] = await pool.execute('SELECT * FROM Ticket WHERE Booking_Id = ?', [bookings[i].Booking_Id]);
            bookings[i].tickets = tickets;
        }
        res.json({ success: true, bookings });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Cancel an Event (deletes all related bookings/tickets via CASCADE)
app.post('/api/admin/cancel-event', async (req, res) => {
    try {
        const { eventId } = req.body;
        // First restore seats info, then delete (CASCADE handles bookings/tickets)
        await pool.execute('DELETE FROM Event WHERE Event_Id = ?', [eventId]);
        res.json({ success: true, message: 'Event cancelled and all related bookings/tickets removed.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Cancel a specific member's booking + trigger refund
app.post('/api/admin/cancel-booking', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { bookingId } = req.body;
        await connection.beginTransaction();
        const [[booking]] = await connection.execute('SELECT Event_Id FROM Booking WHERE Booking_Id = ?', [bookingId]);
        await connection.execute('UPDATE Booking SET Booking_Status = "CANCELLED" WHERE Booking_Id = ?', [bookingId]);
        if (booking) await promoteFromWaitlist(booking.Event_Id, connection);
        await connection.commit();
        res.json({ success: true, message: 'Booking cancelled by Admin. Waitlist promoted if applicable.' });
    } catch (err) { await connection.rollback(); res.status(500).json({ success: false, error: err.message }); }
    finally { connection.release(); }
});

// Admin: Approve a payment → confirms booking, decreases seats, generates tickets
app.post('/api/admin/approve-payment', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { paymentId } = req.body;
        await connection.beginTransaction();

        // 1. Lock payment row to prevent race conditions (double-clicks generating duplicate tickets)
        const [[paymentCheck]] = await connection.execute('SELECT Payment_Status, Booking_Id, Transaction_Id, Amount FROM Payment WHERE Payment_Id = ? FOR UPDATE', [paymentId]);
        if (paymentCheck.Payment_Status === 'SUCCESS') throw new Error('Payment already approved.');

        // 2. Update payment status
        await connection.execute('UPDATE Payment SET Payment_Status = "SUCCESS" WHERE Payment_Id = ?', [paymentId]);

        const isTransfer = paymentCheck.Transaction_Id.startsWith('TXN-TRF-');
        const destBookingId = paymentCheck.Booking_Id;

        if (isTransfer) {
            const transferId = paymentCheck.Transaction_Id.replace('TXN-TRF-', '');
            const [[transfer]] = await connection.execute('SELECT Ticket_Id FROM Ticket_Transfer WHERE Transfer_Id = ?', [transferId]);
            if (!transfer) throw new Error("Transfer record missing.");

            const ticketId = transfer.Ticket_Id;

            // Fetch Ticket old booking info
            const [[ticket]] = await connection.execute(
                'SELECT b.Booking_Id, b.Quantity, b.Event_Id FROM Ticket t JOIN Booking b ON t.Booking_Id = b.Booking_Id WHERE t.Ticket_Id = ?', [ticketId]
            );

            // Confirm Recipient's placeholder booking
            await connection.execute('UPDATE Booking SET Booking_Status = "CONFIRMED" WHERE Booking_Id = ?', [destBookingId]);

            // Shift ticket ownership
            await connection.execute('UPDATE Ticket SET Booking_Id = ? WHERE Ticket_Id = ?', [destBookingId, ticketId]);

            // Adjust Sender's booking
            if (ticket.Quantity <= 1) {
                await connection.execute('UPDATE Booking SET Booking_Status = "CANCELLED" WHERE Booking_Id = ?', [ticket.Booking_Id]);
                await connection.execute('UPDATE Event SET Available_Seats = Available_Seats - ? WHERE Event_Id = ?', [ticket.Quantity, ticket.Event_Id]);
                await connection.execute('DELETE FROM Refund WHERE Payment_Id IN (SELECT Payment_Id FROM Payment WHERE Booking_Id = ?)', [ticket.Booking_Id]);
            } else {
                await connection.execute('UPDATE Booking SET Quantity = Quantity - 1 WHERE Booking_Id = ?', [ticket.Booking_Id]);
            }

            // Transfer value sequence: Reclaim ticket value from Sender's transaction
            const [[origPayment]] = await connection.execute('SELECT * FROM Payment WHERE Booking_Id = ? AND Payment_Status = "SUCCESS" LIMIT 1', [ticket.Booking_Id]);
            if (origPayment) {
                await connection.execute('UPDATE Payment SET Amount = ROUND(Amount - ?, 2) WHERE Payment_Id = ?', [paymentCheck.Amount, origPayment.Payment_Id]);
            }

            // Erase phantom trigger tickets 
            const [delResult] = await connection.execute('DELETE FROM Ticket WHERE Booking_Id = ? AND Ticket_Id != ?', [destBookingId, ticketId]);
            if (delResult.affectedRows > 0) {
                await connection.execute('UPDATE Event SET Available_Seats = Available_Seats + ? WHERE Event_Id = ?', [delResult.affectedRows, ticket.Event_Id]);
            }

            // Flag transfer completed
            await connection.execute('UPDATE Ticket_Transfer SET Status = "COMPLETED" WHERE Transfer_Id = ?', [transferId]);

            await connection.commit();
            res.json({ success: true, message: 'Transfer Payment approved! Ticket shifted & transactions settled.' });
        } else {
            // Standard Ticket Booking Confirmation
            await connection.execute('UPDATE Booking SET Booking_Status = "CONFIRMED" WHERE Booking_Id = ?', [paymentCheck.Booking_Id]);

            const [[booking]] = await connection.execute('SELECT Quantity FROM Booking WHERE Booking_Id = ?', [paymentCheck.Booking_Id]);
            for (let i = 0; i < booking.Quantity; i++) {
                const ticketId = Math.floor(Math.random() * 1000000);
                const seatNumber = `S-${ticketId % 1000}`;
                await connection.execute('INSERT INTO Ticket (Ticket_Id, Seat_Number, Booking_Id) VALUES (?, ?, ?)',
                    [ticketId, seatNumber, paymentCheck.Booking_Id]);
            }

            await connection.commit();
            res.json({ success: true, message: 'Payment approved. Booking confirmed. Tickets generated.' });
        }
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally { connection.release(); }
});

// Admin: Dashboard Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [[{ totalUsers }]] = await pool.execute('SELECT COUNT(*) as totalUsers FROM Users');
        const [[{ totalEvents }]] = await pool.execute('SELECT COUNT(*) as totalEvents FROM Event');
        const [[{ totalBookings }]] = await pool.execute('SELECT COUNT(*) as totalBookings FROM Booking');
        const [[{ totalRevenue }]] = await pool.execute('SELECT COALESCE(SUM(Amount),0) as totalRevenue FROM Payment WHERE Payment_Status = "SUCCESS"');
        const [[{ pendingBusinesses }]] = await pool.execute('SELECT COUNT(*) as pendingBusinesses FROM Business_Account WHERE Approval_Status = "PENDING"');
        res.json({ success: true, stats: { totalUsers, totalEvents, totalBookings, totalRevenue, pendingBusinesses } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Repair Available_Seats (recalculates from actual ticket count)
app.post('/api/admin/repair-seats', async (req, res) => {
    try {
        const [events] = await pool.execute('SELECT Event_Id, Total_Seats FROM Event');
        let fixed = 0;
        for (const ev of events) {
            const [[{ ticketCount }]] = await pool.execute(
                `SELECT COUNT(*) as ticketCount FROM Ticket t
                 JOIN Booking b ON t.Booking_Id = b.Booking_Id
                 WHERE b.Event_Id = ? AND b.Booking_Status = 'CONFIRMED'`, [ev.Event_Id]);
            const correctAvailable = ev.Total_Seats - ticketCount;
            await pool.execute('UPDATE Event SET Available_Seats = ? WHERE Event_Id = ?', [correctAvailable, ev.Event_Id]);
            fixed++;
        }
        res.json({ success: true, message: `Repaired seat counts for ${fixed} events.` });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === BUSINESS (OWNER) CONTROLLERS
// ============================================================
app.get('/api/business/status/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT Approval_Status FROM Business_Account WHERE UserId = ?', [req.params.userId]);
        res.json({ success: true, business: rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/business', async (req, res) => {
    try {
        const { userId, fee } = req.body;
        const businessId = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Business_Account (Business_Id, Registration_Fee, Payment_Status, Approval_Status, UserId) VALUES (?, ?, "PAID", "PENDING", ?)',
            [businessId, fee, userId]);
        res.json({ success: true, message: 'Wait for approval.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/events/create', async (req, res) => {
    try {
        const { name, type, seats, date, deadline, commission, userId } = req.body;
        const [businesses] = await pool.execute('SELECT Business_Id FROM Business_Account WHERE UserId = ? AND Approval_Status = "APPROVED"', [userId]);
        if (businesses.length === 0) return res.status(403).json({ success: false, error: 'Unauthorized.' });
        const venueId = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Venue (Venue_Id, Venue_Name, Location, Capacity, Business_Id) VALUES (?, ?, "Digital Registration", ?, ?)',
            [venueId, name, seats, businesses[0].Business_Id]);
        const eventId = Math.floor(Math.random() * 1000000);
        const bookingDeadline = deadline || `${date} 23:59:59`;
        const commRate = commission || 50;
        await pool.execute('INSERT INTO Event (Event_Id, Event_Name, Event_Type, Event_Date, Total_Seats, Available_Seats, Venue_Id, Booking_Deadline, Commission_Rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [eventId, name, type, date, seats, seats, venueId, bookingDeadline, commRate]);
        res.json({ success: true, message: 'Event Published' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/business/events/:userId', async (req, res) => {
    try {
        const [events] = await pool.execute(
            `SELECT e.Event_Id, e.Event_Name, e.Event_Type, e.Event_Date, e.Booking_Deadline, e.Commission_Rate,
                    e.Total_Seats, e.Available_Seats, e.Approval_Status, v.Venue_Name, v.Location
             FROM Event e JOIN Venue v ON e.Venue_Id = v.Venue_Id
             JOIN Business_Account ba ON v.Business_Id = ba.Business_Id
             WHERE ba.UserId = ? ORDER BY e.Event_Date DESC`, [req.params.userId]);
        res.json({ success: true, events });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Owner: All bookings for owner's events with user details
app.get('/api/business/bookings/:userId', async (req, res) => {
    try {
        const [bookings] = await pool.execute(
            `SELECT b.Booking_Id, b.Booking_Date, b.Booking_Status, b.Quantity,
                    u.Name as UserName, u.Email as UserEmail, u.Phone_Number,
                    e.Event_Id, e.Event_Name, e.Event_Type, e.Event_Date
             FROM Booking b
             JOIN Users u ON b.UserId = u.UserId
             JOIN Event e ON b.Event_Id = e.Event_Id
             JOIN Venue v ON e.Venue_Id = v.Venue_Id
             JOIN Business_Account ba ON v.Business_Id = ba.Business_Id
             WHERE ba.UserId = ?
             ORDER BY b.Booking_Date DESC`, [req.params.userId]);
        // Attach tickets and payment to each booking
        for (let i = 0; i < bookings.length; i++) {
            const [tickets] = await pool.execute('SELECT Ticket_Id, Seat_Number FROM Ticket WHERE Booking_Id = ?', [bookings[i].Booking_Id]);
            bookings[i].tickets = tickets;
            const [payments] = await pool.execute('SELECT Payment_Id, Amount, Payment_Status, Transaction_Id FROM Payment WHERE Booking_Id = ? LIMIT 1', [bookings[i].Booking_Id]);
            bookings[i].payment = payments[0] || null;
        }
        res.json({ success: true, bookings });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === BOOKING CONTROLLER
// ============================================================
app.post('/api/booking', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { userId, eventId, quantity } = req.body;
        if (!userId || !eventId || !quantity) return res.status(400).json({ success: false, error: "Missing fields" });
        await connection.beginTransaction();
        const [events] = await connection.execute('SELECT Available_Seats, Booking_Deadline, Approval_Status FROM Event WHERE Event_Id = ? FOR UPDATE', [eventId]);
        if (events.length === 0 || events[0].Available_Seats < quantity) throw new Error("Not enough seats available.");
        if (events[0].Approval_Status !== 'APPROVED') throw new Error("This event is pending Admin Approval and cannot be booked currently.");
        if (new Date(events[0].Booking_Deadline) < new Date()) throw new Error("Booking deadline has passed. Contact Admin or Owner to extend.");
        const bookingId = Math.floor(Math.random() * 1000000);
        await connection.execute('INSERT INTO Booking (Booking_Id, Booking_Date, Booking_Status, Quantity, UserId, Event_Id) VALUES (?, CURDATE(), "PENDING", ?, ?, ?)',
            [bookingId, quantity, userId, eventId]);
        await connection.commit();
        res.json({ success: true, message: 'Booking Pending. Proceed to payment.', bookingId });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally { connection.release(); }
});

// ============================================================
// === PAYMENT CONTROLLER (Always saves as PENDING — Admin must approve)
// ============================================================
app.post('/api/payment', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { bookingId, amount } = req.body;
        await connection.beginTransaction();
        const paymentId = Math.floor(Math.random() * 1000000);
        const transactionId = `TXN-${paymentId}`;
        // Payment is ALWAYS saved as PENDING. Admin must approve to confirm.
        await connection.execute('INSERT INTO Payment (Payment_Id, Transaction_Id, Amount, Payment_Status, Booking_Id) VALUES (?, ?, ?, "PENDING", ?)',
            [paymentId, transactionId, amount, bookingId]);
        await connection.commit();
        res.json({ success: true, message: 'Payment submitted. Waiting for Admin approval.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally { connection.release(); }
});

// ============================================================
// === TICKETS CONTROLLER
// ============================================================
app.get('/api/tickets/:bookingId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Ticket WHERE Booking_Id = ?', [req.params.bookingId]);
        res.json({ success: true, tickets: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Cancel individual ticket (user cancels 1 out of many)
app.post('/api/tickets/cancel', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { ticketId, bookingId } = req.body;
        await connection.beginTransaction();

        // Get event from booking
        const [bookings] = await connection.execute('SELECT Event_Id, Quantity FROM Booking WHERE Booking_Id = ?', [bookingId]);
        if (bookings.length === 0) throw new Error("Booking not found");

        // Delete the specific ticket
        await connection.execute('DELETE FROM Ticket WHERE Ticket_Id = ?', [ticketId]);

        // Update booking quantity
        const newQty = bookings[0].Quantity - 1;
        if (newQty <= 0) {
            // Cannot set Quantity=0 due to CHECK constraint. 
            // Just cancel. The After_Booking_Cancellation trigger will automatically restore OLD.Quantity (1) seat.
            await connection.execute('UPDATE Booking SET Booking_Status = "CANCELLED" WHERE Booking_Id = ?', [bookingId]);
        } else {
            // No trigger runs, so manually restore 1 seat
            await connection.execute('UPDATE Event SET Available_Seats = Available_Seats + 1 WHERE Event_Id = ?', [bookings[0].Event_Id]);
            await connection.execute('UPDATE Booking SET Quantity = ? WHERE Booking_Id = ?', [newQty, bookingId]);
        }

        // Promote from waitlist if seats opened up
        await promoteFromWaitlist(bookings[0].Event_Id, connection);

        await connection.commit();
        res.json({ success: true, message: 'Ticket cancelled. 1 seat restored.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally { connection.release(); }
});

// ============================================================
// === CUSTOMER: MY BOOKINGS
// ============================================================
app.get('/api/bookings/user/:userId', async (req, res) => {
    try {
        const [bookings] = await pool.execute(
            `SELECT b.Booking_Id, b.Booking_Date, b.Booking_Status, b.Quantity,
                    e.Event_Name, e.Event_Type, e.Event_Date, e.Event_Id
             FROM Booking b JOIN Event e ON b.Event_Id = e.Event_Id
             WHERE b.UserId = ? ORDER BY b.Booking_Date DESC`, [req.params.userId]);
        for (let i = 0; i < bookings.length; i++) {
            if (bookings[i].Booking_Status === 'CONFIRMED') {
                const [tickets] = await pool.execute('SELECT Ticket_Id, Seat_Number FROM Ticket WHERE Booking_Id = ?', [bookings[i].Booking_Id]);
                bookings[i].tickets = tickets;
            } else { bookings[i].tickets = []; }
        }
        res.json({ success: true, bookings });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === USER: PAYMENT HISTORY
// ============================================================
app.get('/api/payments/user/:userId', async (req, res) => {
    try {
        const [payments] = await pool.execute(
            `SELECT p.Payment_Id, p.Transaction_Id, p.Amount, p.Payment_Status,
                    b.Booking_Id, b.Booking_Status, e.Event_Name, e.Event_Type
             FROM Payment p
             JOIN Booking b ON p.Booking_Id = b.Booking_Id
             JOIN Event e ON b.Event_Id = e.Event_Id
             WHERE b.UserId = ?
             ORDER BY p.Payment_Id DESC`, [req.params.userId]);
        res.json({ success: true, payments });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === REFUND CONTROLLER
// ============================================================
app.post('/api/refund', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { bookingId } = req.body;
        await connection.beginTransaction();
        const [[booking]] = await connection.execute('SELECT Event_Id FROM Booking WHERE Booking_Id = ?', [bookingId]);
        await connection.execute('UPDATE Booking SET Booking_Status = "CANCELLED" WHERE Booking_Id = ?', [bookingId]);
        if (booking) await promoteFromWaitlist(booking.Event_Id, connection);
        await connection.commit();
        res.json({ success: true, message: 'Booking Cancelled. Refund processed.' });
    } catch (err) { await connection.rollback(); res.status(500).json({ success: false, error: err.message }); }
    finally { connection.release(); }
});

// ============================================================
// === FEATURE 1: SMART WAITLIST
// ============================================================
app.post('/api/waitlist/join', async (req, res) => {
    try {
        const { userId, eventId, quantity } = req.body;
        // Check if blacklisted
        const [bl] = await pool.execute('SELECT * FROM Blacklist WHERE UserId = ?', [userId]);
        if (bl.length > 0) return res.status(403).json({ success: false, error: 'You are blocked from booking.' });
        const id = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Waitlist (Waitlist_Id, UserId, Event_Id, Quantity, Priority) VALUES (?, ?, ?, ?, ?)',
            [id, userId, eventId, quantity || 1, 'NORMAL']);
        res.json({ success: true, message: 'Added to waitlist!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/waitlist/:eventId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT w.*, u.Name, u.Email FROM Waitlist w JOIN Users u ON w.UserId = u.UserId
             WHERE w.Event_Id = ? AND w.Status = 'WAITING' ORDER BY w.Priority DESC, w.Created_At ASC`, [req.params.eventId]);
        res.json({ success: true, waitlist: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/waitlist/user/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT w.*, e.Event_Name, e.Event_Date FROM Waitlist w JOIN Event e ON w.Event_Id = e.Event_Id
             WHERE w.UserId = ? ORDER BY w.Created_At DESC`, [req.params.userId]);
        res.json({ success: true, waitlist: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 2: SEAT LOCK TIMER
// ============================================================
app.post('/api/seats/lock', async (req, res) => {
    try {
        const { eventId, userId, quantity } = req.body;
        // Clean expired locks first
        await pool.execute('DELETE FROM Seat_Lock WHERE Expires_At < NOW()');
        // Check available seats minus active locks
        const [[event]] = await pool.execute('SELECT Available_Seats FROM Event WHERE Event_Id = ?', [eventId]);
        const [[{ lockedSeats }]] = await pool.execute('SELECT COALESCE(SUM(Quantity),0) as lockedSeats FROM Seat_Lock WHERE Event_Id = ?', [eventId]);
        const realAvailable = event.Available_Seats - lockedSeats;
        if (realAvailable < quantity) return res.status(400).json({ success: false, error: `Only ${realAvailable} seats available.` });
        const lockId = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Seat_Lock (Lock_Id, Event_Id, UserId, Quantity, Expires_At) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 MINUTE))',
            [lockId, eventId, userId, quantity]);
        res.json({ success: true, lockId, expiresIn: 120 });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/seats/release', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Seat_Lock WHERE Lock_Id = ?', [req.body.lockId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 3: SMART REFUND ENGINE
// ============================================================
app.get('/api/refund/calculate/:bookingId', async (req, res) => {
    try {
        const [[booking]] = await pool.execute(
            `SELECT b.*, e.Event_Date, COALESCE(p.Amount, 0) as Amount FROM Booking b
             JOIN Event e ON b.Event_Id = e.Event_Id
             LEFT JOIN Payment p ON p.Booking_Id = b.Booking_Id
             WHERE b.Booking_Id = ? LIMIT 1`, [req.params.bookingId]);
        if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
        const hoursLeft = (new Date(booking.Event_Date) - new Date()) / (1000 * 60 * 60);
        let refundPct = 0;
        if (hoursLeft > 24) refundPct = 100;
        else if (hoursLeft > 12) refundPct = 75;
        else if (hoursLeft > 6) refundPct = 50;
        else if (hoursLeft > 0) refundPct = 30;
        const refundAmount = Math.round(booking.Amount * refundPct / 100);
        res.json({ success: true, refundPct, refundAmount, totalPaid: booking.Amount, hoursLeft: Math.round(hoursLeft) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 4: TICKET TRANSFER
// ============================================================
app.post('/api/tickets/transfer', async (req, res) => {
    try {
        const { ticketId, fromUserId, toEmail } = req.body;
        if (!ticketId || !fromUserId || !toEmail) return res.status(400).json({ success: false, error: 'Missing fields.' });
        // Verify ticket belongs to this user and is confirmed
        const [[ticketCheck]] = await pool.execute(
            `SELECT tk.Ticket_Id FROM Ticket tk
             JOIN Booking b ON tk.Booking_Id = b.Booking_Id
             WHERE tk.Ticket_Id = ? AND b.UserId = ? AND b.Booking_Status = 'CONFIRMED'`, [ticketId, fromUserId]);
        if (!ticketCheck) return res.status(403).json({ success: false, error: 'Ticket not found or you do not own it.' });
        // Check no PENDING transfer already exists for this ticket
        const [[existing]] = await pool.execute('SELECT Transfer_Id FROM Ticket_Transfer WHERE Ticket_Id = ? AND Status = "PENDING"', [ticketId]);
        if (existing) return res.status(400).json({ success: false, error: 'A pending transfer already exists for this ticket.' });
        const [[toUser]] = await pool.execute('SELECT UserId, Name FROM Users WHERE Email = ?', [toEmail]);
        if (!toUser) return res.status(404).json({ success: false, error: 'Recipient email not found in system.' });
        if (toUser.UserId == fromUserId) return res.status(400).json({ success: false, error: 'Cannot transfer to yourself.' });
        const [bl] = await pool.execute('SELECT * FROM Blacklist WHERE UserId = ?', [toUser.UserId]);
        if (bl.length > 0) return res.status(403).json({ success: false, error: 'Recipient is blacklisted.' });
        const transId = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Ticket_Transfer (Transfer_Id, Ticket_Id, From_UserId, To_UserId, Status) VALUES (?, ?, ?, ?, "PENDING")',
            [transId, ticketId, fromUserId, toUser.UserId]);
        res.json({ success: true, message: `Transfer request sent to ${toEmail} (${toUser.Name}). Awaiting their acceptance.` });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/tickets/pay-transfer', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { transferId, userId } = req.body; // userId is the acceptor
        await connection.beginTransaction();

        const [[transfer]] = await connection.execute('SELECT * FROM Ticket_Transfer WHERE Transfer_Id = ? AND To_UserId = ? AND Status = "PENDING"', [transferId, userId]);
        if (!transfer) throw new Error("Transfer not found or already processed.");

        const ticketId = transfer.Ticket_Id;
        const [[ticket]] = await connection.execute('SELECT b.Event_Id FROM Ticket t JOIN Booking b ON t.Booking_Id = b.Booking_Id WHERE t.Ticket_Id = ?', [ticketId]);
        if (!ticket) throw new Error("Ticket data missing.");

        // Create a holding booking for B (PENDING status)
        const destBookingId = Math.floor(Math.random() * 1000000);
        await connection.execute(
            'INSERT INTO Booking (Booking_Id, Booking_Date, Booking_Status, Quantity, UserId, Event_Id) VALUES (?, CURDATE(), "PENDING", 1, ?, ?)',
            [destBookingId, userId, ticket.Event_Id]);

        // Create the PENDING payment holding wrapper
        const unitPrice = 500; // Standard price extracted for this model
        const trfPaymentId = Math.floor(Math.random() * 1000000);

        await connection.execute(
            'INSERT INTO Payment (Payment_Id, Transaction_Id, Amount, Payment_Status, Booking_Id) VALUES (?, ?, ?, "PENDING", ?)',
            [trfPaymentId, `TXN-TRF-${transferId}`, unitPrice, destBookingId]);

        await connection.commit();
        res.json({ success: true, message: 'Transfer payment submitted! Awaiting Admin approval to confirm ticket shift.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
    finally { connection.release(); }
});

app.post('/api/tickets/reject-transfer', async (req, res) => {
    try {
        await pool.execute('UPDATE Ticket_Transfer SET Status = "REJECTED" WHERE Transfer_Id = ? AND To_UserId = ?', [req.body.transferId, req.body.userId]);
        res.json({ success: true, message: 'Transfer rejected.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/tickets/transfers/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT t.*, u1.Name as FromName, u2.Name as ToName, tk.Seat_Number, tk.Booking_Id, e.Event_Name 
             FROM Ticket_Transfer t
             JOIN Users u1 ON t.From_UserId = u1.UserId 
             JOIN Users u2 ON t.To_UserId = u2.UserId
             LEFT JOIN Ticket tk ON t.Ticket_Id = tk.Ticket_Id
             LEFT JOIN Booking b ON tk.Booking_Id = b.Booking_Id
             LEFT JOIN Event e ON b.Event_Id = e.Event_Id
             WHERE t.From_UserId = ? OR t.To_UserId = ? ORDER BY t.Transfer_Date DESC`, [req.params.userId, req.params.userId]);
        res.json({ success: true, transfers: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Get All Transfers for the entire platform
app.get('/api/admin/transfers', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT t.*, u1.Name as FromName, u1.Email as FromEmail, u2.Name as ToName, u2.Email as ToEmail, tk.Seat_Number, e.Event_Name
             FROM Ticket_Transfer t
             JOIN Users u1 ON t.From_UserId = u1.UserId 
             JOIN Users u2 ON t.To_UserId = u2.UserId
             JOIN Ticket tk ON t.Ticket_Id = tk.Ticket_Id
             JOIN Booking b ON tk.Booking_Id = b.Booking_Id
             JOIN Event e ON b.Event_Id = e.Event_Id
             ORDER BY t.Transfer_Date DESC`);
        res.json({ success: true, transfers: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: Get All Waitlist entries for the entire platform
app.get('/api/admin/waitlist', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT w.*, u.Name, u.Email, e.Event_Name, e.Event_Date
             FROM Waitlist w 
             JOIN Users u ON w.UserId = u.UserId
             JOIN Event e ON w.Event_Id = e.Event_Id
             ORDER BY w.Created_At DESC`);
        res.json({ success: true, waitlist: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 5: BLACKLIST / FRAUD SYSTEM
// ============================================================
app.post('/api/admin/blacklist', async (req, res) => {
    try {
        const { userId, reason } = req.body;
        const id = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Blacklist (Blacklist_Id, UserId, Reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE Reason = ?',
            [id, userId, reason, reason]);
        res.json({ success: true, message: 'User blacklisted.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/unblacklist', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Blacklist WHERE UserId = ?', [req.body.userId]);
        res.json({ success: true, message: 'User removed from blacklist.' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/admin/blacklisted', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT b.*, u.Name, u.Email FROM Blacklist b JOIN Users u ON b.UserId = u.UserId');
        res.json({ success: true, blacklisted: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 6: SMART REMINDERS / NOTIFICATIONS
// ============================================================
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        // Trigger Smart Reminders scan
        await generateUpcomingReminders(pool);

        const [rows] = await pool.execute(
            `SELECT r.*, e.Event_Name, e.Event_Date FROM Reminder r
             JOIN Event e ON r.Event_Id = e.Event_Id
             WHERE r.UserId = ? ORDER BY r.Created_At DESC LIMIT 20`, [req.params.userId]);
        res.json({ success: true, notifications: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/notifications/read', async (req, res) => {
    try {
        await pool.execute('UPDATE Reminder SET Is_Read = TRUE WHERE Reminder_Id = ?', [req.body.reminderId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/notifications/create', async (req, res) => {
    try {
        const { userId, eventId, message, type } = req.body;
        const id = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Reminder (Reminder_Id, UserId, Event_Id, Remind_Type, Message) VALUES (?, ?, ?, ?, ?)',
            [id, userId, eventId, type || '1DAY', message]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 7: DEMAND HEATMAP / ANALYTICS
// ============================================================
app.get('/api/admin/analytics', async (req, res) => {
    try {
        // Fastest selling events
        const [sellSpeed] = await pool.execute(
            `SELECT e.Event_Name, e.Total_Seats, e.Available_Seats,
                    ROUND(((e.Total_Seats - e.Available_Seats) / e.Total_Seats) * 100) as SellPct,
                    e.Event_Type
             FROM Event e ORDER BY SellPct DESC`);
        // Bookings by hour
        const [hourly] = await pool.execute(
            `SELECT HOUR(Booking_Date) as BookingHour, COUNT(*) as Count FROM Booking GROUP BY HOUR(Booking_Date) ORDER BY BookingHour`);
        // Revenue by type
        const [revenueByType] = await pool.execute(
            `SELECT e.Event_Type, COALESCE(SUM(p.Amount),0) as Revenue, COUNT(DISTINCT b.Booking_Id) as Bookings
             FROM Event e LEFT JOIN Booking b ON e.Event_Id = b.Event_Id
             LEFT JOIN Payment p ON b.Booking_Id = p.Booking_Id AND p.Payment_Status = 'SUCCESS'
             GROUP BY e.Event_Type`);
        // Cancellation rate
        const [[{ totalB }]] = await pool.execute('SELECT COUNT(*) as totalB FROM Booking');
        const [[{ cancelledB }]] = await pool.execute('SELECT COUNT(*) as cancelledB FROM Booking WHERE Booking_Status = "CANCELLED"');
        res.json({ success: true, analytics: { sellSpeed, hourly, revenueByType, cancellationRate: totalB > 0 ? Math.round(cancelledB / totalB * 100) : 0 } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 8: AUTO EVENT SUGGESTIONS (OWNER)
// ============================================================
app.get('/api/owner/suggestions/:userId', async (req, res) => {
    try {
        const [events] = await pool.execute(
            `SELECT e.Event_Type, COUNT(*) as EventCount,
                    AVG(e.Total_Seats - e.Available_Seats) as AvgBooked,
                    AVG(e.Commission_Rate) as AvgCommission,
                    ROUND(AVG((e.Total_Seats - e.Available_Seats)/e.Total_Seats)*100) as AvgFillRate
             FROM Event e JOIN Venue v ON e.Venue_Id = v.Venue_Id
             JOIN Business_Account ba ON v.Business_Id = ba.Business_Id
             WHERE ba.UserId = ? GROUP BY e.Event_Type ORDER BY AvgFillRate DESC`, [req.params.userId]);
        // Best day analysis
        const [dayData] = await pool.execute(
            `SELECT DAYNAME(b.Booking_Date) as Day, COUNT(*) as Count FROM Booking b
             JOIN Event e ON b.Event_Id = e.Event_Id JOIN Venue v ON e.Venue_Id = v.Venue_Id
             JOIN Business_Account ba ON v.Business_Id = ba.Business_Id
             WHERE ba.UserId = ? GROUP BY DAYNAME(b.Booking_Date) ORDER BY Count DESC`, [req.params.userId]);
        res.json({ success: true, suggestions: events, bestDays: dayData });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 9: CANCELLATION PREDICTION
// ============================================================
app.get('/api/admin/predictions', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT b.Booking_Id, b.Quantity, b.Booking_Status, e.Event_Name, u.Name as UserName, u.UserId,
                    (SELECT COUNT(*) FROM Booking WHERE UserId = u.UserId AND Booking_Status = 'CANCELLED') as UserCancellations,
                    (SELECT COUNT(*) FROM Booking WHERE UserId = u.UserId) as UserTotalBookings
             FROM Booking b JOIN Event e ON b.Event_Id = e.Event_Id JOIN Users u ON b.UserId = u.UserId
             WHERE b.Booking_Status IN ('CONFIRMED','PENDING')`);
        const predictions = rows.map(r => {
            const cancelRate = r.UserTotalBookings > 0 ? (r.UserCancellations / r.UserTotalBookings) : 0;
            let risk = 'LOW';
            if (cancelRate > 0.5) risk = 'HIGH';
            else if (cancelRate > 0.25 || r.Quantity > 5) risk = 'MEDIUM';
            return { ...r, cancelRate: Math.round(cancelRate * 100), risk };
        });
        res.json({ success: true, predictions });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 10: SMART OVERBOOKING
// ============================================================
app.post('/api/events/toggle-overbooking', async (req, res) => {
    try {
        const { eventId, allow, pct } = req.body;
        await pool.execute('UPDATE Event SET Allow_Overbooking = ?, Overbooking_Pct = ? WHERE Event_Id = ?', [allow, pct || 10, eventId]);
        res.json({ success: true, message: allow ? `Overbooking enabled at ${pct || 10}%` : 'Overbooking disabled' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 11: KYC VERIFICATION
// ============================================================
app.post('/api/events/toggle-kyc', async (req, res) => {
    try {
        await pool.execute('UPDATE Event SET KYC_Required = ? WHERE Event_Id = ?', [req.body.kycRequired, req.body.eventId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 12: DUPLICATE EVENT
// ============================================================
app.post('/api/events/duplicate/:eventId', async (req, res) => {
    try {
        const [[ev]] = await pool.execute('SELECT * FROM Event WHERE Event_Id = ?', [req.params.eventId]);
        if (!ev) return res.status(404).json({ success: false, error: 'Event not found' });
        const newId = Math.floor(Math.random() * 1000000);
        await pool.execute(
            'INSERT INTO Event (Event_Id, Event_Name, Event_Type, Event_Date, Total_Seats, Available_Seats, Venue_Id, Booking_Deadline, Commission_Rate, KYC_Required) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newId, ev.Event_Name + ' (Copy)', ev.Event_Type, ev.Event_Date, ev.Total_Seats, ev.Total_Seats, ev.Venue_Id, ev.Booking_Deadline, ev.Commission_Rate, ev.KYC_Required]);
        res.json({ success: true, message: 'Event duplicated!', newEventId: newId });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 13: GROUP MEMBER PROFILES
// ============================================================
app.get('/api/group-members/:userId', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Group_Member WHERE UserId = ?', [req.params.userId]);
        res.json({ success: true, members: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/group-members', async (req, res) => {
    try {
        const { userId, name, email, phone } = req.body;
        const id = Math.floor(Math.random() * 1000000);
        await pool.execute('INSERT INTO Group_Member (Member_Id, UserId, Member_Name, Member_Email, Member_Phone) VALUES (?, ?, ?, ?, ?)',
            [id, userId, name, email, phone]);
        res.json({ success: true, message: 'Member saved!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/group-members/:memberId', async (req, res) => {
    try {
        await pool.execute('DELETE FROM Group_Member WHERE Member_Id = ?', [req.params.memberId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 14: GAMIFICATION
// ============================================================
app.get('/api/rewards/:userId', async (req, res) => {
    try {
        let [rows] = await pool.execute('SELECT * FROM User_Rewards WHERE UserId = ?', [req.params.userId]);
        if (rows.length === 0) {
            const id = Math.floor(Math.random() * 1000000);
            await pool.execute('INSERT INTO User_Rewards (Reward_Id, UserId) VALUES (?, ?)', [id, req.params.userId]);
            rows = [{ Points: 0, Badge: 'NONE', Total_Bookings: 0, Total_Checkins: 0 }];
        }
        // Recalculate from actual data
        const [[{ bookCount }]] = await pool.execute('SELECT COUNT(*) as bookCount FROM Booking WHERE UserId = ? AND Booking_Status = "CONFIRMED"', [req.params.userId]);
        const points = bookCount * 10;
        let badge = 'NONE';
        if (points >= 100) badge = 'SUPER_FAN';
        else if (points >= 50) badge = 'VIP';
        else if (points >= 30) badge = 'FREQUENT_BOOKER';
        else if (points >= 10) badge = 'EARLY_BIRD';
        await pool.execute('UPDATE User_Rewards SET Points = ?, Badge = ?, Total_Bookings = ? WHERE UserId = ?', [points, badge, bookCount, req.params.userId]);
        res.json({ success: true, rewards: { Points: points, Badge: badge, Total_Bookings: bookCount } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 15: EVENT CHECK-IN
// ============================================================
app.post('/api/tickets/checkin', async (req, res) => {
    try {
        const { ticketId } = req.body;
        await pool.execute('UPDATE Ticket SET Checked_In = TRUE, Checkin_Time = NOW() WHERE Ticket_Id = ?', [ticketId]);
        res.json({ success: true, message: 'Checked in!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/events/checkin-stats/:eventId', async (req, res) => {
    try {
        const [[stats]] = await pool.execute(
            `SELECT COUNT(*) as totalTickets,
                    SUM(t.Checked_In) as checkedIn,
                    COUNT(*) - SUM(t.Checked_In) as remaining
             FROM Ticket t JOIN Booking b ON t.Booking_Id = b.Booking_Id
             WHERE b.Event_Id = ? AND b.Booking_Status = 'CONFIRMED'`, [req.params.eventId]);
        res.json({ success: true, stats });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// === FEATURE 16: VENUE LAYOUT SUGGESTION
// ============================================================
app.get('/api/venue/layout-suggestion/:eventType', async (req, res) => {
    const layouts = {
        'Concert': { layout: 'Standing + Tiered', sections: ['VIP Front Row', 'General Standing', 'Balcony'], tip: 'Use standing sections for max capacity' },
        'Marriage': { layout: 'Round Tables', sections: ['Stage Area', 'Family Tables', 'Guest Tables', 'Buffet Zone'], tip: 'Round tables of 8-10 for family events' },
        'Conference': { layout: 'Theater Rows', sections: ['Speaker Stage', 'VIP Row', 'General Rows', 'Standing Back'], tip: 'Theater-style rows with clear sightlines' },
        'Sports': { layout: 'Stadium Tiers', sections: ['Pitch Side', 'Lower Tier', 'Upper Tier', 'Box Seats'], tip: 'Tiered seating for clear viewing angles' },
        'College Fest': { layout: 'Open Ground', sections: ['Main Stage', 'Food Stalls', 'Activity Zones', 'Seating Area'], tip: 'Open layout with multiple activity zones' },
        'Show': { layout: 'Auditorium', sections: ['Front Orchestra', 'Rear Orchestra', 'Mezzanine', 'Balcony'], tip: 'Classic auditorium layout for best acoustics' },
    };
    res.json({ success: true, suggestion: { ...(layouts[req.params.eventType] || layouts['Concert']), type: req.params.eventType } });
});

// ============================================================
// === FEATURE 17: MESSAGING / CONVERSATION SYSTEM
// ============================================================

// Send a message
app.post('/api/messages/send', async (req, res) => {
    try {
        const { fromUserId, toUserId, message, messageType } = req.body;
        if (!fromUserId || !toUserId || !message) return res.status(400).json({ success: false, error: 'Missing fields' });
        await pool.execute(
            'INSERT INTO Messages (From_UserId, To_UserId, Message, Message_Type) VALUES (?, ?, ?, ?)',
            [fromUserId, toUserId, message, messageType || 'GENERAL']
        );
        res.json({ success: true, message: 'Message sent!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Get all conversations for a user (grouped by the other person)
app.get('/api/messages/inbox/:userId', async (req, res) => {
    try {
        const uid = req.params.userId;
        const [rows] = await pool.execute(
            `SELECT m.*, 
                    u_from.Name as FromName, u_from.Role as FromRole,
                    u_to.Name as ToName, u_to.Role as ToRole
             FROM Messages m
             JOIN Users u_from ON m.From_UserId = u_from.UserId
             JOIN Users u_to ON m.To_UserId = u_to.UserId
             WHERE m.From_UserId = ? OR m.To_UserId = ?
             ORDER BY m.Created_At DESC`, [uid, uid]);

        // Group into conversations by the other user
        const convos = {};
        rows.forEach(msg => {
            const otherUserId = String(msg.From_UserId) === String(uid) ? msg.To_UserId : msg.From_UserId;
            const otherName = String(msg.From_UserId) === String(uid) ? msg.ToName : msg.FromName;
            const otherRole = String(msg.From_UserId) === String(uid) ? msg.ToRole : msg.FromRole;
            if (!convos[otherUserId]) {
                convos[otherUserId] = {
                    userId: otherUserId,
                    name: otherName,
                    role: otherRole,
                    lastMessage: msg.Message,
                    lastMessageType: msg.Message_Type,
                    lastTime: msg.Created_At,
                    unreadCount: 0
                };
            }
            if (String(msg.To_UserId) === String(uid) && !msg.Is_Read) {
                convos[otherUserId].unreadCount++;
            }
        });
        res.json({ success: true, conversations: Object.values(convos) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Get conversation between two users
app.get('/api/messages/conversation/:userId1/:userId2', async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const [rows] = await pool.execute(
            `SELECT m.*, u.Name as SenderName, u.Role as SenderRole
             FROM Messages m JOIN Users u ON m.From_UserId = u.UserId
             WHERE (m.From_UserId = ? AND m.To_UserId = ?) OR (m.From_UserId = ? AND m.To_UserId = ?)
             ORDER BY m.Created_At ASC`,
            [userId1, userId2, userId2, userId1]);

        // Mark messages as read
        await pool.execute(
            'UPDATE Messages SET Is_Read = TRUE WHERE To_UserId = ? AND From_UserId = ? AND Is_Read = FALSE',
            [userId1, userId2]);

        res.json({ success: true, messages: rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Mark a message as read
app.post('/api/messages/read', async (req, res) => {
    try {
        await pool.execute('UPDATE Messages SET Is_Read = TRUE WHERE Message_Id = ?', [req.body.messageId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Get all users the current user can message (for starting new conversations)
app.get('/api/messages/contacts/:userId', async (req, res) => {
    try {
        const uid = req.params.userId;
        const [[currentUser]] = await pool.execute('SELECT Role FROM Users WHERE UserId = ?', [uid]);
        let query;
        if (currentUser.Role === 'ADMIN') {
            // Admin can message everyone
            query = 'SELECT UserId, Name, Email, Role FROM Users WHERE UserId != ? ORDER BY Role, Name';
        } else {
            // Customers/Owners can message Admin + all other users
            query = 'SELECT UserId, Name, Email, Role FROM Users WHERE UserId != ? ORDER BY FIELD(Role, "ADMIN", "OWNER", "CUSTOMER"), Name';
        }
        const [users] = await pool.execute(query, [uid]);
        res.json({ success: true, contacts: users });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Get unread message count
app.get('/api/messages/unread/:userId', async (req, res) => {
    try {
        const [[{ count }]] = await pool.execute(
            'SELECT COUNT(*) as count FROM Messages WHERE To_UserId = ? AND Is_Read = FALSE', [req.params.userId]);
        res.json({ success: true, unreadCount: count });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get("/api/users", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Users");
        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Database error" });
    }
});

app.get("/test-db", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1");
        res.json({ success: true, message: "DB Connected ✅" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend securely running on http://localhost:${PORT}`);
});
