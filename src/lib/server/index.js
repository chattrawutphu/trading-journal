import express from 'express';
import { corsMiddleware } from './middleware/cors.js';

const app = express();
const port = process.env.SERVER_PORT || 5000;

// Apply CORS middleware before routes
app.use(corsMiddleware);

// ... rest of your server setup

app.listen(port, () => {
    // console.log(`Server running on port ${port}`);
});