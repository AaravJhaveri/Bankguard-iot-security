const requireManager = (req, res, next) => {
  if (!req.user || req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden. Manager role required.' });
  }
  next();
};

const requireEmployee = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
};

module.exports = {
  requireManager,
  requireEmployee,
};

