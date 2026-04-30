import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const apiKey = localStorage.getItem('sim_api_key');

  if (apiKey && apiKey.trim().length > 0) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
