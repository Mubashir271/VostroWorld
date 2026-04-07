export const PASSWORD_RULES = [
  { key: 'length', label: 'Minimum 8 characters', test: (v: string) => v.length >= 8 },
  { key: 'upper', label: 'At least one uppercase letter (A-Z)', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'At least one lowercase letter (a-z)', test: (v: string) => /[a-z]/.test(v) },
  { key: 'number', label: 'At least one number (0-9)', test: (v: string) => /\d/.test(v) },
  { key: 'special', label: 'At least one special character (!@#$%^&*)', test: (v: string) => /[!@#$%^&*]/.test(v) },
];

export const getPasswordStrength = (password: string) => {
  if (!password) return 'None';
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 2) return 'Weak';
  if (passed <= 4) return 'Medium';
  return 'Strong';
};