# Simple Makefile to Setup and Run the Event Management System

# Ensure Homebrew paths are included
export PATH := /opt/homebrew/bin:$(PATH)

.PHONY: help install db run all

help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies for backend and frontend"
	@echo "  make db       - Import the database schema (requires MySQL password)"
	@echo "  make run      - Start both backend and frontend servers"
	@echo "  make all      - Install and run everything"

install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

db:
	@echo "Importing database schema..."
	@echo "Note: You will be prompted for your MySQL root password."
	mysql -u root -p < Event_Mangement.sql
	mysql -u root -p EventDB < task6_transactions.sql

run:
	@echo "Starting backend and frontend..."
	@echo "Backend will run on http://localhost:8080"
	@echo "Frontend will run on http://localhost:5173"
	(cd backend && node server.js) & (cd frontend && npm run dev)

all: install run
