function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied: requires one of [${allowedRoles.join(', ')}] role`
      });
    }

    next();
  };
}

module.exports = { requireRole };
