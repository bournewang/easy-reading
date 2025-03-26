import { NextApiRequest, NextApiResponse } from 'next';

const allowedOrigins = [
  'https://english-reader.com',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];

export function corsMiddleware(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    console.log('==========\nCORS Middleware - Request:', {
      method: req.method,
      origin: req.headers.origin,
      path: req.url,
    });

    const origin = req.headers.origin;
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      if (origin && allowedOrigins.includes(origin)) {
        console.log('CORS Middleware - Allowing preflight for origin:', origin);
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
        return res.status(200).end();
      }
      
      console.log('CORS Middleware - Rejecting preflight for origin:', origin);
      return res.status(403).end();
    }

    // Handle actual requests
    if (origin && allowedOrigins.includes(origin)) {
      console.log('CORS Middleware - Allowing request for origin:', origin);
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    } else {
      console.log('CORS Middleware - No origin or origin not allowed:', origin);
    }

    // Call the handler
    return handler(req, res);
  };
} 