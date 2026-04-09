USE EventDB;

START TRANSACTION;
INSERT INTO Users (UserId, Name, Email, Phone_Number, Password, Role) 
VALUES (21, 'Alice Smith', 'alice@gmail.com', '9000000021', '$2b$10$xyz_hash_Alice', 'CUSTOMER');
INSERT INTO Booking (Booking_Id, Booking_Date, Booking_Status, Quantity, UserId, Event_Id) 
VALUES (406, CURRENT_DATE, 'PENDING', 2, 21, 301);
COMMIT;


START TRANSACTION;
INSERT INTO Users (UserId, Name, Email, Phone_Number, Password, Role) 
VALUES (22, 'Bob Error', 'bob@gmail.com', '9000000022', '$2b$10$xyz_hash_Bob', 'CUSTOMER');
ROLLBACK;


SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
START TRANSACTION;
UPDATE Venue SET Capacity = 600 WHERE Venue_Id = 201; 
SELECT Capacity FROM Venue WHERE Venue_Id = 201;
ROLLBACK;


START TRANSACTION;
UPDATE Event SET Available_Seats = Available_Seats - 1 WHERE Event_Id = 301;
START TRANSACTION;
UPDATE Event SET Available_Seats = Available_Seats - 1 WHERE Event_Id = 301;
COMMIT;
COMMIT;


START TRANSACTION;
SELECT Available_Seats FROM Event WHERE Event_Id = 301 FOR UPDATE;
UPDATE Event SET Available_Seats = Available_Seats - 1 WHERE Event_Id = 301;
COMMIT;


SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT Capacity FROM Venue WHERE Venue_Id = 202; 
START TRANSACTION;
UPDATE Venue SET Capacity = 1100 WHERE Venue_Id = 202;
COMMIT;
SELECT Capacity FROM Venue WHERE Venue_Id = 202; 
COMMIT;


SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
