require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer();

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/', async (req, res) => {
    const endpoints = {
        gender: process.env.GENDER_API_URL || 'http://localhost:8000',
        animal: process.env.ANIMAL_API_URL || 'http://localhost:8001',
        flower: process.env.FLOWER_API_URL || 'http://localhost:8002',
        hand: process.env.HAND_API_URL || 'http://localhost:8003'
    };

    const status = { gateway: 'online', services: {} };

    // Check each service
    for (const [name, url] of Object.entries(endpoints)) {
        try {
            await axios.get(`${url}/`, { timeout: 1000 });
            status.services[name] = 'online';
        } catch (err) {
            status.services[name] = 'offline';
        }
    }

    res.json(status);
});

// 2. Gender AI Proxy
app.post('/api/gender/predict', upload.single('file'), async (req, res) => {
    try {
        const GENDER_API = process.env.GENDER_API_URL || 'http://localhost:8000';
        
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${GENDER_API}/predict`, form, {
            headers: { ...form.getHeaders() }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Gender Proxy Error:', error.message);
        res.status(500).json({ error: 'Gender AI Service unreachable', details: error.message });
    }
});

// 3. Animal AI Proxy
app.post('/api/animal/predict', upload.single('file'), async (req, res) => {
    try {
        const ANIMAL_API = process.env.ANIMAL_API_URL || 'http://localhost:8001';
        
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${ANIMAL_API}/predict`, form, {
            headers: { ...form.getHeaders() }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Animal Proxy Error:', error.message);
        res.status(500).json({ error: 'Animal AI Service unreachable', details: error.message });
    }
});

// 4. Flower AI Proxy
app.post('/api/flower/predict', upload.single('file'), async (req, res) => {
    try {
        const FLOWER_API = process.env.FLOWER_API_URL || 'http://localhost:8002';
        
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${FLOWER_API}/predict`, form, {
            headers: { ...form.getHeaders() }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Flower Proxy Error:', error.message);
        res.status(500).json({ error: 'Flower AI Service unreachable', details: error.message });
    }
});

// 5. Hand AI Proxy
app.post('/api/hand/predict', upload.single('file'), async (req, res) => {
    try {
        const HAND_API = process.env.HAND_API_URL || 'http://localhost:8003';
        
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${HAND_API}/predict`, form, {
            headers: { ...form.getHeaders() }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Hand Proxy Error:', error.message);
        res.status(500).json({ error: 'Hand AI Service unreachable', details: error.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Gateway running on http://localhost:${PORT}`);
});