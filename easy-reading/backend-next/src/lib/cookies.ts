import { NextApiRequest } from 'next';

export function parseCookies(req: NextApiRequest) {
  const cookies: { [key: string]: string } = {};

  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value);
    });
  }

  return cookies;
} 