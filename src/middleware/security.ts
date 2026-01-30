import type { NextFunction, Request, Response } from 'express';
import aj from '../config/arcjet';
import { ArcjetNodeRequest, ArcjetRequest, slidingWindow } from '@arcjet/node';

const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { user } = req;

  if(process.env.NODE_ENV === 'test') return next()

  try {
    const role: RateLimitRole = user?.role || 'guest';
    let limit: number;
    let message: string;

    switch(role) {
      case 'admin':
        limit = 20;
        message = 'admin rate limit exceeded';
        break;
      case 'teacher':
        limit = 10;
        message = 'teacher rate limit exceeded';
        break;
      case 'student':
        limit = 10;
        message = 'student rate limit exceeded';
        break;
      default:
        limit = 5;
        message = 'guest rate limit exceeded';
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        interval: '1m',
        max: limit,
      })
    );

    const arcjetRequest: ArcjetNodeRequest = {
      headers: req.headers,
      method: req.method,
      url: req.originalUrl ?? req.url,
      socket: {
        remoteAddress: req.socket.remoteAddress ?? req.ip ?? '0.0.0.0',
      }
    }


    const decision = await client.protect(arcjetRequest);

    if(decision.isDenied() && decision.reason.isBot()) {
      return res.status(403).json({ error: 'Forbidden', message: 'Bot detected' });
    }
    if(decision.isDenied() && decision.reason.isRateLimit()) {
      return res.status(429).json({ error: 'Too Many Requests', message: message });
    }
    if(decision.isDenied() && decision.reason.isShield()) {
      return res.status(403).json({ error: 'Forbidden', message: 'Shield detected' });
    }

    next();

  } catch (error) {
    console.error('Error in security middleware', error);
    return res.status(500).json({ error: 'Internal server error', message: 'An error occurred while processing the request' });
  }
}

export default securityMiddleware;