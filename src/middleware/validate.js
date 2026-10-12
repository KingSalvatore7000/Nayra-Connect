const VALID_CASE_TYPES = ['bail', 'family', 'labor', 'property', 'consumer', 'criminal'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['New', 'Allocated', 'Unassigned', 'Scheduled', 'Closed'];

function validateCaseIntake(req, res, next) {
  const { client_name, phone, case_type, description, priority } = req.body;

  if (!client_name || typeof client_name !== 'string' || client_name.trim().length === 0) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  if (!phone || typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())) {
    return res.status(400).json({ error: 'Phone must be a valid 10-digit number' });
  }

  if (!case_type || !VALID_CASE_TYPES.includes(case_type.trim().toLowerCase())) {
    return res.status(400).json({
      error: `Invalid case_type. Allowed types: ${VALID_CASE_TYPES.join(', ')}`
    });
  }

  if (!priority || !VALID_PRIORITIES.includes(priority.trim())) {
    return res.status(400).json({
      error: `Invalid priority. Allowed priorities: ${VALID_PRIORITIES.join(', ')}`
    });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required' });
  }

  if (description.trim().length > 1000) {
    return res.status(400).json({ error: 'Description cannot exceed 1000 characters' });
  }

  // Normalize request body values
  req.body.client_name = client_name.trim();
  req.body.phone = phone.trim();
  req.body.case_type = case_type.trim().toLowerCase();
  req.body.priority = priority.trim();
  req.body.description = description.trim();

  next();
}

function validateCaseStatus(req, res, next) {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status.trim())) {
    return res.status(400).json({
      error: `Invalid status. Allowed statuses: ${VALID_STATUSES.join(', ')}`
    });
  }
  req.body.status = status.trim();
  next();
}

const DEFAULT_TARGET_DAYS = {
  bail: 3,
  criminal: 7,
  family: 14,
  labor: 21,
  consumer: 21,
  property: 30
};

module.exports = {
  VALID_CASE_TYPES,
  VALID_PRIORITIES,
  VALID_STATUSES,
  DEFAULT_TARGET_DAYS,
  validateCaseIntake,
  validateCaseStatus
};
