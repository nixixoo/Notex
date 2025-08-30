export class SecurityUtil {
  
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remove object and embed tags
      .replace(/<(object|embed)[^>]*>.*?<\/(object|embed)>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove data URLs that could contain scripts
      .replace(/data:(?!image\/)[^;]+;base64,/gi, '')
      // Trim whitespace
      .trim();
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static isValidURL(url: string, allowedProtocols: string[] = ['http', 'https']): boolean {
    try {
      const urlObj = new URL(url);
      return allowedProtocols.includes(urlObj.protocol.slice(0, -1));
    } catch {
      return false;
    }
  }

  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .substring(0, 255)
      .trim();
  }

  static preventClickjacking(): void {
    if (window.top !== window.self) {
      document.body.innerHTML = 'This page cannot be displayed in a frame.';
      window.top!.location = window.location;
    }
  }

  static secureLocalStorage = {
    setItem(key: string, value: string): void {
      try {
        const sanitizedKey = SecurityUtil.sanitizeInput(key);
        const sanitizedValue = SecurityUtil.sanitizeInput(value);
        localStorage.setItem(sanitizedKey, sanitizedValue);
      } catch (error) {
      }
    },

    getItem(key: string): string | null {
      try {
        const sanitizedKey = SecurityUtil.sanitizeInput(key);
        const value = localStorage.getItem(sanitizedKey);
        return value ? SecurityUtil.sanitizeInput(value) : null;
      } catch (error) {
        return null;
      }
    },

    removeItem(key: string): void {
      try {
        const sanitizedKey = SecurityUtil.sanitizeInput(key);
        localStorage.removeItem(sanitizedKey);
      } catch (error) {
      }
    }
  };
}