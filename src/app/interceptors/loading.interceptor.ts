import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip loading indicator for certain requests
  const skipLoading = req.headers.get('X-Skip-Loading') === 'true' ||
                     req.url.includes('/health') ||
                     req.url.includes('/ping');

  if (!skipLoading) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        loadingService.hide();
      }
    })
  );
};