// Restricts a route to one or more roles. Super Admin always passes,
// since it's a hidden flag layered on top of a normal role.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.isSuperAdmin) {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not permitted for this role' });
    }
    next();
  };
}

module.exports = requireRole;
