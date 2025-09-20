const express = require('express');
const bcrypt = require('bcryptjs');
const { 
  generateToken, 
  findUserByEmail, 
  findUserById, 
  createUser,
  users,
  authenticateToken
} = require('../middleware/auth');

const router = express.Router();

// Role constants
const ROLES = {
  SYSTEM_PERSON: 'SuperUser',
  ADMIN: 'Admin',
  INVOICING_USER: 'InvoicingUser',
  CONTACT_MASTER: 'ContactMaster'
};

const DEFAULT_SIGNUP_ROLE = ROLES.INVOICING_USER;

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Special case for System Person
    if (email === 'system@shiv' && password === 'super') {
      const systemUser = {
        id: 'super-1',
        email: 'system@shiv',
        name: 'System Named Person',
        role: ROLES.SYSTEM_PERSON,
        companyName: 'Shiv Accounts Cloud'
      };

      const token = generateToken(systemUser);
      return res.json({
        success: true,
        message: 'Login successful',
        user: systemUser,
        token
      });
    }

    // Find user by email
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // In production, use bcrypt to compare hashed passwords
    // For now, simple comparison (replace with proper password hashing)
    if (user.password !== password) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyName: user.companyName
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed due to server error'
    });
  }
});

/**
 * POST /api/auth/signup
 * Register new user
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, companyName, role } = req.body;

    // Validation
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'All fields are required'
      });
    }

    // Validate role
    const validRoles = [ROLES.INVOICING_USER, ROLES.CONTACT_MASTER];
    const assignedRole = role && validRoles.includes(role) ? role : DEFAULT_SIGNUP_ROLE;

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create new user
    const newUser = createUser({
      email,
      password, // In production, hash this password
      name,
      companyName,
      role: assignedRole
    });

    const token = generateToken(newUser);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        companyName: newUser.companyName
      },
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Signup failed due to server error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const { user } = req; // Set by authenticateToken middleware

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyName: user.companyName
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

/**
 * POST /api/auth/create-admin
 * Create admin user (System Person only)
 */
router.post('/create-admin', authenticateToken, async (req, res) => {
  try {
    const { user } = req; // Set by authenticateToken middleware

    if (!user || user.role !== ROLES.SYSTEM_PERSON) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only System Person can create admin users'
      });
    }

    const { email, password, name, companyName } = req.body;

    // Validation
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'All fields are required'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create admin user
    const newAdmin = createUser({
      email,
      password, // In production, hash this password
      name,
      companyName,
      role: ROLES.ADMIN
    });

    const token = generateToken(newAdmin);
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        companyName: newAdmin.companyName
      },
      token
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create admin user'
    });
  }
});

/**
 * GET /api/auth/users
 * Get all users (System Person only)
 */
router.get('/users', authenticateToken, (req, res) => {
  try {
    const { user } = req; // Set by authenticateToken middleware

    if (!user || user.role !== ROLES.SYSTEM_PERSON) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only System Person can view all users'
      });
    }

    const userList = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      companyName: u.companyName,
      createdAt: u.createdAt
    }));

    res.json({
      success: true,
      users: userList
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get users list'
    });
  }
});

module.exports = router;
