# Quick Setup Guide

## For the person receiving this backend:

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Cloudinary account (for image uploads)
- Google Generative AI API key (for AI features)

### 2. Quick Start
```bash
# 1. Copy the .env.example to .env
cp env.example .env

# 2. Edit the .env file with your actual values
# Minimum required:
# - MONGODB_URI
# - JWT_SECRET

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

### 3. Environment Variables (Required)
Edit the `.env` file with these values:

```env
# Database (Required)
MONGODB_URI=mongodb://localhost:27017/medai

# JWT Secret (Required)
JWT_SECRET=your-super-secret-jwt-key-here

# Server (Optional - defaults provided)
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. Optional Features
If you want to use these features, add the API keys:

```env
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google AI (for AI diagnosis)
GOOGLE_API_KEY=your-google-ai-key
```

### 5. Test the API
```bash
# Health check
curl http://localhost:5000/api/health
```

### 6. Default Admin Account
The system automatically creates a default admin account:
- Email: admin@medai.com
- Password: admin123

**⚠️ Important: Change this password in production!**

### 7. API Documentation
- All endpoints are documented in the README.md
- Use Postman or similar tools to test the API
- Base URL: `http://localhost:5000/api`

### 8. Support
If you encounter issues:
1. Check the logs in the `logs/` directory
2. Verify your MongoDB connection
3. Ensure all required environment variables are set
4. Check the README.md for detailed documentation
