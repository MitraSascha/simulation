import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiKey = localStorage.getItem('sim_api_key') || '';
  if (apiKey && !req.url.includes('/health')) {
    const cloned = req.clone({
      setHeaders: { 'X-API-Key': apiKey }
    });
    return next(cloned);
  }
  return next(req);
};
