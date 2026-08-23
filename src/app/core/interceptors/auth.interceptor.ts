import { HttpInterceptorFn } from '@angular/common/http';

function readToken(): string | null {
  const raw = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

  if (!raw) 
    return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = readToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned);
  }

  return next(req);
};