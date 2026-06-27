import axios from 'axios';

const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

const api = axios.create({
  baseURL: isProduction
    ? "https://event-management-system-1-xnyy.onrender.com/api"
    : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api")
});

export default api;
