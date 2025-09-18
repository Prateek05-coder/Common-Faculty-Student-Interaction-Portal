# Faculty Portal API Documentation

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "student"
    }
  }
}
```

#### GET /auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "student"
  }
}
```

### Users

#### GET /users/profile
Get user profile information.

#### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "phone": "+1234567890"
}
```

### Courses

#### GET /courses
Get user's courses based on role.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "course_id",
      "name": "Course Name",
      "code": "CS101",
      "description": "Course description"
    }
  ]
}
```

## Error Responses

All endpoints return errors in the following format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

### Common HTTP Status Codes
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error