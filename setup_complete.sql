DROP DATABASE IF EXISTS EventDB;
CREATE DATABASE EventDB;
USE EventDB;

-- 1. Users Table
CREATE TABLE Users(
    UserId INT PRIMARY KEY,
    Name VARCHAR(30) NOT NULL,
    Email VARCHAR(39) NOT NULL UNIQUE,
    Phone_Number VARCHAR(15) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Role ENUM('CUSTOMER','OWNER','ADMIN') NOT NULL,
    Address TEXT,
    Age INT,
    Gender VARCHAR(15),
    Proof_Id VARCHAR(50),
    Country VARCHAR(50)
);

-- 2. Business Account Table
CREATE TABLE Business_Account(
    Business_Id INT PRIMARY KEY,
    Registration_Fee FLOAT NOT NULL,
    Payment_Status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    Approval_Status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    UserId INT NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Venue Table
CREATE TABLE Venue(
    Venue_Id INT PRIMARY KEY,
    Venue_Name VARCHAR(70) NOT NULL,
    Location VARCHAR(70) NOT NULL,
    Capacity INT NOT NULL CHECK (Capacity > 0),
    Business_Id INT NOT NULL,
    FOREIGN KEY (Business_Id) REFERENCES Business_Account(Business_Id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Event Table (FIXED)
CREATE TABLE Event(
    Event_Id INT PRIMARY KEY,
    Event_Name VARCHAR(40) NOT NULL,
    Event_Type VARCHAR(50) NOT NULL,
    Event_Date DATE NOT NULL,
    Total_Seats INT NOT NULL CHECK (Total_Seats>0),
    Available_Seats INT NOT NULL,
    Venue_Id INT NOT NULL,
    Approval_Status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    Booking_Deadline DATETIME,
    Commission_Rate DECIMAL(10,2) DEFAULT 50.00,
    Allow_Overbooking BOOLEAN DEFAULT FALSE,
    Overbooking_Pct INT DEFAULT 0,
    KYC_Required BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (Venue_Id) REFERENCES Venue(Venue_Id) ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (Available_Seats <= Total_Seats),
    CHECK (Available_Seats >= 0)
);

-- 5. Booking Table
CREATE TABLE Booking(
   Booking_Id INT PRIMARY KEY,
   Booking_Date DATE NOT NULL,
   Booking_Status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
   Quantity INT NOT NULL DEFAULT 1 CHECK (Quantity > 0),
   UserId INT NOT NULL,
   Event_Id INT NOT NULL,
   FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE ON UPDATE CASCADE,
   FOREIGN KEY (Event_Id) REFERENCES Event(Event_Id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Payment Table
CREATE TABLE Payment(
    Payment_Id INT PRIMARY KEY,
    Transaction_Id VARCHAR(50) NOT NULL UNIQUE,
    Amount DECIMAL(10,2) NOT NULL,
    Payment_Status ENUM('SUCCESS','FAILED','PENDING') NOT NULL,
    Booking_Id INT NOT NULL,
    FOREIGN KEY (Booking_Id) REFERENCES Booking(Booking_Id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. Ticket Table
CREATE TABLE Ticket(
    Ticket_Id INT PRIMARY KEY,
    Seat_Number VARCHAR(10) NOT NULL,
    Booking_Id INT NOT NULL,
    Checked_In BOOLEAN DEFAULT FALSE,
    Checkin_Time DATETIME DEFAULT NULL,
    FOREIGN KEY (Booking_Id) REFERENCES Booking(Booking_Id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. Refund Table
CREATE TABLE Refund(
    Refund_Id INT PRIMARY KEY,
    Refund_Amount DECIMAL(10,2) NOT NULL,
    Refund_Status ENUM('PENDING','PROCESSED','FAILED') NOT NULL DEFAULT 'PENDING',
    Refund_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Refund_Reason VARCHAR(255),
    Payment_Id INT NOT NULL,
    FOREIGN KEY (Payment_Id) REFERENCES Payment(Payment_Id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. Group Member Table (NEW)
CREATE TABLE Group_Member (
    Member_Id INT PRIMARY KEY,
    UserId INT NOT NULL,
    Member_Name VARCHAR(50) NOT NULL,
    Member_Email VARCHAR(50) NOT NULL,
    Member_Phone VARCHAR(15) NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 9. Ticket Transfer Table
CREATE TABLE Ticket_Transfer (
    Transfer_Id INT PRIMARY KEY,
    Ticket_Id INT NOT NULL,
    From_UserId INT NOT NULL,
    To_UserId INT NOT NULL,
    Status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    Transfer_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Ticket_Id) REFERENCES Ticket(Ticket_Id) ON DELETE CASCADE,
    FOREIGN KEY (From_UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    FOREIGN KEY (To_UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 10. Waitlist Table
CREATE TABLE Waitlist (
    Waitlist_Id INT PRIMARY KEY,
    UserId INT NOT NULL,
    Event_Id INT NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    Priority ENUM('NORMAL', 'VIP', 'URGENT') DEFAULT 'NORMAL',
    Status ENUM('WAITING', 'PROMOTED', 'CANCELLED') DEFAULT 'WAITING',
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    FOREIGN KEY (Event_Id) REFERENCES Event(Event_Id) ON DELETE CASCADE
);

-- 11. Seat Lock Table
CREATE TABLE Seat_Lock (
    Lock_Id INT PRIMARY KEY,
    Event_Id INT NOT NULL,
    UserId INT NOT NULL,
    Quantity INT NOT NULL,
    Expires_At DATETIME NOT NULL,
    FOREIGN KEY (Event_Id) REFERENCES Event(Event_Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 12. Blacklist Table
CREATE TABLE Blacklist (
    Blacklist_Id INT PRIMARY KEY,
    UserId INT NOT NULL UNIQUE,
    Reason VARCHAR(255),
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 13. User Rewards Table
CREATE TABLE User_Rewards (
    Reward_Id INT PRIMARY KEY,
    UserId INT NOT NULL UNIQUE,
    Points INT DEFAULT 0,
    Badge ENUM('NONE', 'EARLY_BIRD', 'FREQUENT_BOOKER', 'VIP', 'SUPER_FAN') DEFAULT 'NONE',
    Total_Bookings INT DEFAULT 0,
    Total_Checkins INT DEFAULT 0,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 14. Messages Table
CREATE TABLE Messages (
    Message_Id INT PRIMARY KEY AUTO_INCREMENT,
    From_UserId INT NOT NULL,
    To_UserId INT NOT NULL,
    Message TEXT NOT NULL,
    Message_Type ENUM('GENERAL', 'INQUIRY', 'URGENT') DEFAULT 'GENERAL',
    Is_Read BOOLEAN DEFAULT FALSE,
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (From_UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    FOREIGN KEY (To_UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 15. Reminder Table
CREATE TABLE Reminder (
    Reminder_Id INT PRIMARY KEY AUTO_INCREMENT,
    UserId INT NOT NULL,
    Event_Id INT NOT NULL,
    Remind_Type VARCHAR(20),
    Message VARCHAR(255),
    Is_Read BOOLEAN DEFAULT FALSE,
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    FOREIGN KEY (Event_Id) REFERENCES Event(Event_Id) ON DELETE CASCADE
);

-- INDEXES
CREATE INDEX user_phone ON Users(Phone_Number);
CREATE INDEX venue_name ON Venue(Venue_Name);
CREATE INDEX event_date ON Event(Event_Date);

-- TRIGGERS
DELIMITER //

CREATE TRIGGER Before_Insert_Business_Account
BEFORE INSERT ON Business_Account
FOR EACH ROW
BEGIN
    DECLARE v_role VARCHAR(20);
    SELECT Role INTO v_role FROM Users WHERE UserId = NEW.UserId;
    IF v_role != 'OWNER' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User must have OWNER role to create a Business Account';
    END IF;
END;
//

CREATE TRIGGER Update_Available_Seats
AFTER INSERT ON Ticket
FOR EACH ROW
BEGIN
    DECLARE v_event_id INT;
    SELECT Event_Id INTO v_event_id FROM Booking WHERE Booking_Id = NEW.Booking_Id;
    UPDATE Event SET Available_Seats = Available_Seats - 1 WHERE Event_Id = v_event_id;
END;
//

DELIMITER ;

-- SEED DATA
-- Insert Admin (Password: Admin@123)
INSERT INTO Users (UserId, Name, Email, Phone_Number, Password, Role)
VALUES (1, 'Admin', 'admin@eventtix.com', '9999999999', '$2b$10$8ugdSb06o49C7JGjuC1dO.c6qMZZFOPc8.y6FdHcnlM9O.glyM11.', 'ADMIN');

-- Sample Owner
INSERT INTO Users (UserId, Name, Email, Phone_Number, Password, Role)
VALUES (2, 'John Owner', 'john@owner.com', '8888888888', '$2b$10$8ugdSb06o49C7JGjuC1dO.c6qMZZFOPc8.y6FdHcnlM9O.glyM11.', 'OWNER');

-- Business & Venue
INSERT INTO Business_Account (Business_Id, Registration_Fee, Payment_Status, Approval_Status, UserId)
VALUES (1, 1500.0, 'PAID', 'APPROVED', 2);
INSERT INTO Venue (Venue_Id, Venue_Name, Location, Capacity, Business_Id)
VALUES (1, 'Enterprise Arena', 'Tech Park', 1000, 1);

-- Sample Event
INSERT INTO Event (Event_Id, Event_Name, Event_Type, Event_Date, Total_Seats, Available_Seats, Venue_Id, Approval_Status, Booking_Deadline, Commission_Rate)
VALUES (1, 'Tech Summit 2026', 'Conference', '2026-10-15', 200, 200, 1, 'APPROVED', '2026-10-14 23:59:59', 75.00);
