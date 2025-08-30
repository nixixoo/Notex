import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { LoadingService } from '../services/loading.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const loadingService = inject(LoadingService);
  const router = inject(Router);

  return next(req).pipe(
    // Retry failed requests (except for certain status codes)
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Don't retry on client errors (4xx) except 408, 429
        if (error.status >= 400 && error.status < 500 && 
            error.status !== 408 && error.status !== 429) {
          throw error;
        }
        
        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        return timer(delay);
      }
    }),
    
    catchError((error: HttpErrorResponse) => {
      // Hide loading indicator on error
      loadingService.hide();

      let errorMessage = 'An unexpected error occurred';
      let shouldShowNotification = true;

      // Handle different error types
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
          break;
          
        case 400:
          errorMessage = error.error?.error || error.error?.message || 'Invalid request';
          break;
          
        case 401:
          errorMessage = 'Your session has expired. Please log in again.';
          // Only redirect if this is not an auth-related request
          // Let the AuthService handle auth errors gracefully
          const isAuthRelated = req.url.includes('/auth/me') || 
                               req.url.includes('/auth/validate') ||
                               req.url.includes('/auth/refresh');
          if (!isAuthRelated) {
            setTimeout(() => router.navigate(['/login']), 1000);
          } else {
            // For auth-related requests, don't show notification
            shouldShowNotification = false;
          }
          break;
          
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
          
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
          
        case 408:
          errorMessage = 'Request timeout. Please try again.';
          break;
          
        case 409:
          errorMessage = error.error?.error || 'A conflict occurred. Please refresh and try again.';
          break;
          
        case 413:
          errorMessage = 'File too large. Please choose a smaller file.';
          break;
          
        case 422:
          errorMessage = error.error?.error || 'Validation failed. Please check your input.';
          break;
          
        case 429:
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
          break;
          
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
          
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
          
        default:
          // For unknown errors, try to extract message from response
          if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
      }

      // Log detailed error for debugging


      // Show user-friendly notification
      if (shouldShowNotification) {
        // Don't show notifications for authentication-related errors
        const isAuthRelated = req.url.includes('/auth/me') || 
                             req.url.includes('/auth/validate') ||
                             req.url.includes('/auth/refresh');
        
        if (!isAuthRelated) {
          if (error.status >= 500) {
            notificationService.showError(errorMessage, 'Server Error');
          } else if (error.status === 401) {
            notificationService.showWarning(errorMessage, 'Authentication Required');
          } else if (error.status === 403) {
            notificationService.showWarning(errorMessage, 'Access Denied');
          } else if (error.status >= 400) {
            notificationService.showError(errorMessage, 'Request Failed');
          } else {
            notificationService.showError(errorMessage, 'Network Error');
          }
        }
      }

      // Create enhanced error object
      const enhancedError = {
        ...error,
        userMessage: errorMessage,
        timestamp: new Date(),
        handled: true
      };

      return throwError(() => enhancedError);
    })
  );
};