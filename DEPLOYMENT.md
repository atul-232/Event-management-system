# Deployment Guide

This guide explains how to deploy the Event Management & Ticket Booking System for free.

Since this is a full-stack application, the deployment is divided into three parts:
1. **Database:** MySQL Database hosted on **Clever Cloud** or **Aiven** (Free).
2. **Backend API:** Node.js Express server hosted on **Render** (Free).
3. **Frontend App:** React.js static site hosted on **Vercel** or **Netlify** (Free).

---

## Step 1: Deploy the MySQL Database (Free)

We will use **Clever Cloud** as it offers a quick, free MySQL database (up to 10MB, which is plenty for testing this project).

1. Go to [Clever Cloud](https://www.clever-cloud.com/) and sign up for a free account.
2. In the Clever Cloud console, click **Create** > **an add-on**.
3. Select **MySQL** and choose the **Free (Dev) plan**.
4. Name your database and select a hosting region closest to you.
5. Once created, click on your MySQL add-on to view the credentials:
   - **Host**
   - **Database Name** (starts with `b...`)
   - **User** (starts with `u...`)
   - **Password**
   - **Port** (usually `3306`)
6. Construct your connection URL string:
   `mysql://<User>:<Password>@<Host>:<Port>/<Database_Name>`
   *(Keep this URL safe; we will use it in Step 2)*.

### Import the Database Schema
1. Connect to your database using a free GUI client like **DBeaver**, **MySQL Workbench**, or the command line.
2. Run the SQL script from `setup_complete.sql` to create all tables, triggers, and seed the initial admin account.

---

## Step 2: Deploy the Backend API on Render (Free)

We will use **Render** to deploy the Node.js Express server.

1. Go to [Render](https://render.com/) and log in (using GitHub).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `Event-management-system` repository.
4. Set the following configuration settings:
   - **Name:** `eventtix-backend`
   - **Runtime:** `Node`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Select the **Free** tier.
5. Scroll down to the **Environment Variables** section and add:
   - `DATABASE_URL` = `<your_mysql_connection_url_from_step_1>`
   - `PORT` = `8080`
   - `JWT_SECRET` = `any_random_secure_string_for_tokens`
6. Click **Deploy Web Service**.
7. Once successfully deployed, Render will provide a public URL (e.g., `https://eventtix-backend.onrender.com`). Copy this URL.

*Note: Free instances on Render spin down after 15 minutes of inactivity, so the first API request after some time might take about 50 seconds to boot up.*

---

## Step 3: Deploy the Frontend on Vercel (Free)

We will use **Vercel** to host the React frontend.

1. Go to [Vercel](https://vercel.com/) and log in using your GitHub account.
2. Click **Add New** > **Project**.
3. Import your `Event-management-system` repository.
4. Set the following configuration settings:
   - **Framework Preset:** `Vite` (Vercel should auto-detect this).
   - **Root Directory:** `frontend`
5. Expand the **Environment Variables** section and add:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://<your-backend-onrender-url>/api` *(Make sure to add `/api` at the end!)*
6. Click **Deploy**.
7. Vercel will build your React application and provide you with a live frontend link (e.g., `https://event-management-system.vercel.app`).
