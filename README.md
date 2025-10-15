# MedAI Backend API

A comprehensive healthcare platform backend built with Node.js, Express.js, and MongoDB. This API provides endpoints for user management, doctor services, AI-powered diagnosis, lab services, and administrative functions.

## Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with role-based access control
- 👥 **User Management** - Patient registration, profile management, and appointments
- 👨‍⚕️ **Doctor Services** - Doctor registration, profile management, earnings tracking
- 🤖 **AI Diagnosis** - AI-powered medical diagnosis using Google Generative AI
- 🧪 **Lab Services** - Lab management, test requests, and report generation
- 👨‍💼 **Admin Panel** - Administrative functions, doctor approvals, system management
- 📊 **Appointment System** - Complete appointment booking and management
- 🔒 **Security** - Rate limiting, CORS, helmet security, input validation

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Cloudinary integration
- **AI Integration**: Google Generative AI
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

Before running this application, make sure you have:

- Node.js (v18.0.0 or higher)
- MongoDB (local or MongoDB Atlas)
- Cloudinary account (for image uploads)
- Google Generative AI API key (for AI features)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medai-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the environment template
   cp env.example .env
   
   # Edit the .env file with your configuration
   nano .env
   ```

4. **Configure Environment Variables**
   
   Edit the `.env` file with your actual values:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/medai

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret

   # Google Generative AI
   GOOGLE_API_KEY=your-google-generative-ai-api-key
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### User Routes (`/api/users`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Doctor Routes (`/api/doctors`)
- `POST /register` - Doctor registration
- `POST /login` - Doctor login
- `GET /profile` - Get doctor profile
- `PUT /profile` - Update doctor profile
- `GET /earnings` - Get doctor earnings

### Appointment Routes (`/api/appointments`)
- `POST /book` - Book an appointment
- `GET /user/:userId` - Get user appointments
- `GET /doctor/:doctorId` - Get doctor appointments
- `PUT /:id/status` - Update appointment status

### AI Routes (`/api/ai`)
- `POST /diagnosis` - AI-powered medical diagnosis

### Lab Routes (`/api/labs`)
- `POST /register` - Lab registration
- `POST /login` - Lab login
- `POST /request` - Create lab test request
- `GET /requests/:labId` - Get lab requests
- `POST /report` - Upload lab report

### Admin Routes (`/api/admin`)
- `POST /login` - Admin login
- `GET /doctors/pending` - Get pending doctor approvals
- `PUT /doctors/:id/approve` - Approve doctor registration
- `PUT /doctors/:id/reject` - Reject doctor registration
- `GET /stats` - Get system statistics

## Database Models

### User
- Basic user information and authentication

### Doctor
- Doctor profile, specialization, and verification status

### Appointment
- Appointment booking and management

### Lab/LabRequest/LabReport
- Laboratory services and test management

### Admin
- Administrative user management

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents API abuse (100 requests per 15 minutes per IP)
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers protection
- **Input Validation**: Joi-based request validation
- **Password Hashing**: bcryptjs for secure password storage

## Project Structure

```
├── config/          # Database and environment configuration
├── middlewares/     # Custom middleware functions
├── modules/         # Feature-based modules
│   ├── admin/       # Admin functionality
│   ├── ai/          # AI diagnosis features
│   ├── doctor/      # Doctor management
│   ├── lab/         # Laboratory services
│   └── user/        # User management
├── utils/           # Utility functions
├── logs/            # Application logs
├── server.js        # Main application entry point
└── package.json     # Dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email support@medai.com or create an issue in the repository.

## API Documentation

For detailed API documentation, please refer to the individual module README files or use tools like Postman to explore the endpoints.
