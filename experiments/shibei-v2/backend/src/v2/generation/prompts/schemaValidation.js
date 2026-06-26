export function createValidationResult(errors) {
  return {
    ok: errors.length === 0,
    errors
  };
}

export function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function requireFields(value, fields, path, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const field of fields) {
    if (!isNonEmptyString(value[field]) && value[field] !== 0) {
      errors.push(`${path}.${field} is required`);
    }
  }
}

export function validateUniqueIds(items, path, errors) {
  const seen = new Set();

  items.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(`${path}[${index}] must be an object`);
      return;
    }

    if (!isNonEmptyString(item.id)) {
      errors.push(`${path}[${index}].id is required`);
      return;
    }

    if (seen.has(item.id)) {
      errors.push(`${path}[${index}].id must be unique`);
    }
    seen.add(item.id);
  });

  return seen;
}
