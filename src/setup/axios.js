// File: frontend/src/setup/axios.js
import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:8080', // Đảm bảo đúng
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Thêm logging để debug
instance.interceptors.request.use(
    config => {
        console.log('📤 Request:', config.method?.toUpperCase(), config.baseURL + config.url);
        return config;
    },
    error => {
        console.error('📤 Request Error:', error);
        return Promise.reject(error);
    }
);

instance.interceptors.response.use(
    response => {
        console.log('📥 Response:', response.status, response.config.url);
        return response;
    },
    error => {
        console.error('📥 Response Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        }
        return Promise.reject(error);
    }
);

export default instance;