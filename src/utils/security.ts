import { globalRateLimiter, RATE_LIMIT_CONFIGS } from './rateLimiter';

/**
 * Request validation utilities for API security
 */

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'date' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => boolean;
  sanitizer?: (value: unknown) => unknown;
}

export interface SecurityContext {
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Input validation and sanitization
 */
export class InputValidator {
  static validate(data: Record<string, unknown>, rules: ValidationRule[]): { isValid: boolean; errors: string[]; sanitizedData: Record<string, unknown> } {
    const errors: string[] = [];
    const sanitizedData: Record<string, unknown> = {};

    for (const rule of rules) {
      const value = data[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push(`${rule.field} must be a valid ${rule.type}`);
        continue;
      }

      // Length validation for strings
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
          continue;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must be no more than ${rule.maxLength} characters long`);
          continue;
        }
      }

      // Numeric range validation
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
          continue;
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must be no more than ${rule.max}`);
          continue;
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
        continue;
      }

      // Custom validation
      if (rule.customValidator && !rule.customValidator(value)) {
        errors.push(`${rule.field} is invalid`);
        continue;
      }

      // Sanitize the value
      let sanitizedValue = value;
      if (rule.sanitizer) {
        sanitizedValue = rule.sanitizer(value);
      } else {
        sanitizedValue = this.defaultSanitize(value, rule.type);
      }

      sanitizedData[rule.field] = sanitizedValue;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData,
    };
  }

  private static validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return typeof value === 'string' && /^[+]?[\d\s\-()]{10,}$/.test(value);
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'uuid':
        return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      default:
        return true;
    }
  }

  private static defaultSanitize(value: unknown, type?: string): unknown {
    if (typeof value === 'string') {
      // Basic HTML/script tag removal
      let sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
      sanitized = sanitized.trim();
      
      if (type === 'email') {
        return sanitized.toLowerCase();
      }
      return sanitized;
    }
    
    return value;
  }
}

/**
 * Permission-based access control
 */
export class AccessControl {
  private static rolePermissions: Record<string, string[]> = {
    'Admin': [
      'invoices:read', 'invoices:write', 'invoices:delete',
      'contacts:read', 'contacts:write', 'contacts:delete',
      'products:read', 'products:write', 'products:delete',
      'payments:read', 'payments:write', 'payments:delete',
      'reports:read', 'reports:write',
      'users:read', 'users:write', 'users:delete',
      'settings:read', 'settings:write'
    ],
    'InvoicingUser': [
      'invoices:read', 'invoices:write',
      'contacts:read', 'contacts:write',
      'products:read',
      'payments:read', 'payments:write',
      'reports:read'
    ],
    'ContactMaster': [
      'contacts:read', 'contacts:write',
      'products:read',
      'reports:read'
    ]
  };

  static hasPermission(userRole: string, permission: string): boolean {
    const permissions = this.rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }

  static checkPermissions(userRole: string, requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(userRole, permission));
  }

  static filterDataByPermissions<T extends Record<string, unknown>>(
    data: T[],
    userRole: string,
    entityType: string
  ): T[] {
    // For demo purposes, Admin sees all, others see filtered data
    if (userRole === 'Admin') {
      return data;
    }

    // Implement specific filtering logic based on entityType and userRole
    switch (entityType) {
      case 'invoices':
        return userRole === 'InvoicingUser' ? data : [];
      case 'contacts':
        return data; // All users can see contacts
      case 'products':
        return data; // All users can see products
      default:
        return [];
    }
  }
}

/**
 * Security middleware for API calls
 */
export class SecurityMiddleware {
  static async validateRequest(
    endpoint: string,
    data: Record<string, unknown>,
    context: SecurityContext
  ): Promise<{ isValid: boolean; errors: string[]; sanitizedData?: Record<string, unknown> }> {
    const errors: string[] = [];

    // Rate limiting check
    const identifier = context.userId || context.ipAddress || 'anonymous';
    const rateLimitConfig = this.getRateLimitConfig(endpoint);
    
    if (globalRateLimiter.isRateLimited(identifier, rateLimitConfig)) {
      return {
        isValid: false,
        errors: ['Rate limit exceeded. Please try again later.']
      };
    }

    // Permission check
    const requiredPermissions = this.getRequiredPermissions(endpoint);
    if (requiredPermissions.length > 0) {
      if (!context.userRole || !AccessControl.checkPermissions(context.userRole, requiredPermissions)) {
        return {
          isValid: false,
          errors: ['Insufficient permissions for this operation.']
        };
      }
    }

    // Input validation
    const validationRules = this.getValidationRules(endpoint);
    const validation = InputValidator.validate(data, validationRules);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors
      };
    }

    // Additional security checks
    const securityChecks = await this.performSecurityChecks(endpoint, data, context);
    if (!securityChecks.isValid) {
      errors.push(...securityChecks.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: validation.sanitizedData
    };
  }

  private static getRateLimitConfig(endpoint: string) {
    if (endpoint.includes('auth') || endpoint.includes('login')) {
      return RATE_LIMIT_CONFIGS.AUTH;
    }
    if (endpoint.includes('payment')) {
      return RATE_LIMIT_CONFIGS.PAYMENT;
    }
    if (endpoint.includes('upload')) {
      return RATE_LIMIT_CONFIGS.UPLOAD;
    }
    return RATE_LIMIT_CONFIGS.API;
  }

  private static getRequiredPermissions(endpoint: string): string[] {
    const permissionMap: Record<string, string[]> = {
      '/api/invoices': ['invoices:read'],
      'POST /api/invoices': ['invoices:write'],
      'PUT /api/invoices': ['invoices:write'],
      'DELETE /api/invoices': ['invoices:delete'],
      '/api/contacts': ['contacts:read'],
      'POST /api/contacts': ['contacts:write'],
      'PUT /api/contacts': ['contacts:write'],
      'DELETE /api/contacts': ['contacts:delete'],
      '/api/products': ['products:read'],
      'POST /api/products': ['products:write'],
      'PUT /api/products': ['products:write'],
      'DELETE /api/products': ['products:delete'],
      '/api/payments': ['payments:read'],
      'POST /api/payments': ['payments:write'],
      '/api/reports': ['reports:read'],
      '/api/users': ['users:read'],
      'POST /api/users': ['users:write'],
    };

    return permissionMap[endpoint] || [];
  }

  private static getValidationRules(endpoint: string): ValidationRule[] {
    const ruleMap: Record<string, ValidationRule[]> = {
      'POST /api/invoices': [
        { field: 'customerName', required: true, type: 'string', minLength: 2, maxLength: 100 },
        { field: 'amount', required: true, type: 'number', min: 0 },
        { field: 'invoiceNumber', required: true, type: 'string', minLength: 3, maxLength: 50 },
        { field: 'dueDate', required: true, type: 'date' },
      ],
      'POST /api/contacts': [
        { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 100 },
        { field: 'email', required: false, type: 'email' },
        { field: 'phone', required: false, type: 'phone' },
        { field: 'type', required: true, type: 'string', customValidator: (v) => typeof v === 'string' && ['Customer', 'Vendor'].includes(v) },
      ],
      'POST /api/products': [
        { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 100 },
        { field: 'price', required: true, type: 'number', min: 0 },
        { field: 'category', required: true, type: 'string', minLength: 2, maxLength: 50 },
      ],
      'POST /api/payments': [
        { field: 'amount', required: true, type: 'number', min: 0 },
        { field: 'type', required: true, type: 'string', customValidator: (v) => typeof v === 'string' && ['Received', 'Made'].includes(v) },
        { field: 'reference', required: true, type: 'string', minLength: 3, maxLength: 100 },
      ],
    };

    return ruleMap[endpoint] || [];
  }

  private static async performSecurityChecks(
    endpoint: string,
    data: Record<string, unknown>,
    context: SecurityContext
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /<iframe/i,
      /eval\(/i,
      /expression\(/i,
    ];

    const dataString = JSON.stringify(data);
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(dataString)) {
        errors.push('Potentially malicious content detected');
        break;
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bOR\b.*=.*=|\bAND\b.*=.*=)/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(dataString)) {
        errors.push('Potentially malicious SQL detected');
        break;
      }
    }

    // Check for excessive data size
    if (dataString.length > 100000) { // 100KB limit
      errors.push('Request data size exceeds limit');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Common validation rule sets
export const ValidationRules = {
  invoice: [
    { field: 'customerName', required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    { field: 'amount', required: true, type: 'number' as const, min: 0 },
    { field: 'invoiceNumber', required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    { field: 'dueDate', required: true, type: 'date' as const },
  ],
  contact: [
    { field: 'name', required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    { field: 'email', required: false, type: 'email' as const },
    { field: 'phone', required: false, type: 'phone' as const },
    { field: 'type', required: true, type: 'string' as const, customValidator: (v: string) => ['Customer', 'Vendor'].includes(v) },
  ],
  product: [
    { field: 'name', required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    { field: 'price', required: true, type: 'number' as const, min: 0 },
    { field: 'category', required: true, type: 'string' as const, minLength: 2, maxLength: 50 },
  ],
  payment: [
    { field: 'amount', required: true, type: 'number' as const, min: 0 },
    { field: 'type', required: true, type: 'string' as const, customValidator: (v: string) => ['Received', 'Made'].includes(v) },
    { field: 'reference', required: true, type: 'string' as const, minLength: 3, maxLength: 100 },
  ],
} as const;