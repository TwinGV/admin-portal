import { Router, Request, Response } from 'express';
import { authenticateLDAP, getUserInfo } from '../auth/ldap';
import { isAuthenticated } from '../auth/middleware';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const user = await authenticateLDAP(username, password);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if user is in allowed group
    const allowedGroup = process.env.LDAP_GROUP || 'LS Docs ВТС Компьютерная служба';
    const isInGroup = user.groups.some(group => 
      group.toLowerCase().includes(allowedGroup.toLowerCase())
    );

    if (!isInGroup) {
      res.status(403).json({ error: 'Access Denied: User is not in the required group' });
      return;
    }

    // Set session
    req.session!.user = user;

    res.json({
      success: true,
      user: {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        isInAllowedGroup: user.isInAllowedGroup
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session!.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Could not logout' });
      return;
    }
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/user
 * Get current authenticated user
 */
router.get('/user', isAuthenticated, (req: Request, res: Response) => {
  const user = req.session!.user;
  res.json({
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    isInAllowedGroup: user.isInAllowedGroup
  });
});

/**
 * GET /api/auth/status
 * Check if user is authenticated
 */
router.get('/status', (req: Request, res: Response) => {
  if (req.session?.user) {
    res.json({
      authenticated: true,
      user: {
        username: req.session.user.username,
        displayName: req.session.user.displayName,
        email: req.session.user.email,
        isInAllowedGroup: req.session.user.isInAllowedGroup
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;
