// Restricts a route to one or more roles. Admin always passes, since they
// have full access regardless of the roles a given route lists.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'admin' || req.user.isSuperAdmin) {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not permitted for this role' });
    }
    next();
  };
}

module.exports = requireRole;