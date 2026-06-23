import { Request, Response, NextFunction } from 'express';
import { SessionUser } from '../types/index';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.user = req.session.user;
  next();
}

/**
 * Check if user is in allowed group
 */
export function isInAllowedGroup(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const allowedGroup = process.env.LDAP_GROUP || 'LS Docs ВТС Компьютерная служба';
  const isInGroup = req.session.user.groups?.some(group => 
    group.toLowerCase().includes(allowedGroup.toLowerCase())
  );

  if (!isInGroup) {
    res.status(403).json({ error: 'Access Denied: User is not in the required group' });
    return;
  }

  req.user = req.session.user;
  next();
}
