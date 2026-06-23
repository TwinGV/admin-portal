import ldap from 'ldapjs';
import { User, SessionUser } from '../types/index';

const ldapClient = ldap.createClient({
  url: process.env.LDAP_URL || 'ldap://localhost',
  reconnect: true,
  tlsOptions: {
    rejectUnauthorized: false
  }
});

ldapClient.on('error', (err) => {
  console.error('LDAP Client Error:', err);
});

/**
 * Authenticate user with LDAP and check group membership
 */
export async function authenticateLDAP(username: string, password: string): Promise<SessionUser | null> {
  return new Promise((resolve) => {
    const userDn = `cn=${username},${process.env.LDAP_SEARCH_BASE || process.env.LDAP_BASE_DN}`;

    // Try to bind as user
    const userClient = ldap.createClient({
      url: process.env.LDAP_URL || 'ldap://localhost',
      reconnect: true,
      tlsOptions: {
        rejectUnauthorized: false
      }
    });

    userClient.bind(userDn, password, (err) => {
      if (err) {
        console.error('LDAP Bind Error:', err.message);
        userClient.unbind();
        resolve(null);
        return;
      }

      // Bind successful, now get user details and group membership
      getUserDetailsAndGroups(username, (userData) => {
        userClient.unbind();
        resolve(userData);
      });
    });

    userClient.on('error', () => {
      userClient.unbind();
      resolve(null);
    });
  });
}

/**
 * Get user details and check group membership
 */
function getUserDetailsAndGroups(username: string, callback: (user: SessionUser | null) => void): void {
  const bindDn = process.env.LDAP_BIND_DN || '';
  const bindPassword = process.env.LDAP_BIND_PASSWORD || '';
  const searchBase = process.env.LDAP_SEARCH_BASE || process.env.LDAP_BASE_DN || '';
  const allowedGroup = process.env.LDAP_GROUP || 'LS Docs ВТС Компьютерная служба';

  const adminClient = ldap.createClient({
    url: process.env.LDAP_URL || 'ldap://localhost',
    reconnect: true,
    tlsOptions: {
      rejectUnauthorized: false
    }
  });

  adminClient.bind(bindDn, bindPassword, (err) => {
    if (err) {
      console.error('Admin LDAP Bind Error:', err.message);
      adminClient.unbind();
      callback(null);
      return;
    }

    // Search for user
    const opts = {
      filter: `(cn=${username})`,
      scope: 'sub',
      attributes: ['cn', 'displayName', 'mail', 'memberOf']
    };

    adminClient.search(searchBase, opts, (err, res) => {
      if (err) {
        console.error('LDAP Search Error:', err.message);
        adminClient.unbind();
        callback(null);
        return;
      }

      let found = false;
      const entries: any[] = [];

      res.on('searchEntry', (entry) => {
        entries.push(entry.pojo);
      });

      res.on('end', () => {
        adminClient.unbind();

        if (entries.length === 0) {
          callback(null);
          return;
        }

        const entry = entries[0];
        const groups = (entry.attributes?.find((a: any) => a.type === 'memberOf')?.values || []) as string[];
        
        // Check if user is in allowed group
        const isInAllowedGroup = groups.some(group => 
          group.toLowerCase().includes(allowedGroup.toLowerCase())
        );

        const user: SessionUser = {
          username: entry.attributes?.find((a: any) => a.type === 'cn')?.values?.[0] || username,
          displayName: entry.attributes?.find((a: any) => a.type === 'displayName')?.values?.[0] || username,
          email: entry.attributes?.find((a: any) => a.type === 'mail')?.values?.[0] || '',
          groups: groups,
          isInAllowedGroup: isInAllowedGroup
        };

        callback(user);
      });

      res.on('error', (err) => {
        console.error('LDAP Search Stream Error:', err.message);
        adminClient.unbind();
        callback(null);
      });
    });

    adminClient.on('error', () => {
      adminClient.unbind();
      callback(null);
    });
  });
}

/**
 * Get user info from current session (for authenticated requests)
 */
export function getUserInfo(username: string, callback: (user: User | null) => void): void {
  const bindDn = process.env.LDAP_BIND_DN || '';
  const bindPassword = process.env.LDAP_BIND_PASSWORD || '';
  const searchBase = process.env.LDAP_SEARCH_BASE || process.env.LDAP_BASE_DN || '';

  const adminClient = ldap.createClient({
    url: process.env.LDAP_URL || 'ldap://localhost',
    reconnect: true,
    tlsOptions: {
      rejectUnauthorized: false
    }
  });

  adminClient.bind(bindDn, bindPassword, (err) => {
    if (err) {
      adminClient.unbind();
      callback(null);
      return;
    }

    const opts = {
      filter: `(cn=${username})`,
      scope: 'sub',
      attributes: ['cn', 'displayName', 'mail', 'memberOf']
    };

    adminClient.search(searchBase, opts, (err, res) => {
      if (err) {
        adminClient.unbind();
        callback(null);
        return;
      }

      const entries: any[] = [];

      res.on('searchEntry', (entry) => {
        entries.push(entry.pojo);
      });

      res.on('end', () => {
        adminClient.unbind();

        if (entries.length === 0) {
          callback(null);
          return;
        }

        const entry = entries[0];
        const groups = (entry.attributes?.find((a: any) => a.type === 'memberOf')?.values || []) as string[];

        const user: User = {
          username: entry.attributes?.find((a: any) => a.type === 'cn')?.values?.[0] || username,
          displayName: entry.attributes?.find((a: any) => a.type === 'displayName')?.values?.[0] || username,
          email: entry.attributes?.find((a: any) => a.type === 'mail')?.values?.[0] || '',
          groups: groups
        };

        callback(user);
      });

      res.on('error', () => {
        adminClient.unbind();
        callback(null);
      });
    });

    adminClient.on('error', () => {
      adminClient.unbind();
      callback(null);
    });
  });
}
