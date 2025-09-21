const jwt = require('jsonwebtoken');

// Mock user database (in production, use actual database)
const users = [
  {
    id: 'super-1',
    email: 'system@shiv',
    name: 'System Named Person',
    role: 'SuperUser',
    companyName: 'Shiv Accounts Cloud',
    password: 'super' // In production, use hashed passwords
  }
];

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate JWT tokens
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'No token provided' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid token', 
        message: 'Token is invalid or expired' 
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware to check if user has required role
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'User not authenticated' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions', 
        message: `Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name,
      companyName: user.companyName
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Find user by email
 */
function findUserByEmail(email) {
  return users.find(user => user.email === email);
}

/**
 * Find user by ID
 */
function findUserById(id) {
  return users.find(user => user.id === id);
}

/**
 * Create new user (for signup)
 */
function createUser(userData) {
  const newUser = {
    id: 'u-' + Date.now().toString(),
    ...userData,
    createdAt: new Date()
  };
  users.push(newUser);
  return newUser;
}

module.exports = {
  authenticateToken,
  requireRole,
  generateToken,
  findUserByEmail,
  findUserById,
  createUser,
  users
};
