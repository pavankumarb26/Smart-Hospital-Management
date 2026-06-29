const API_URL = import.meta.env.VITE_API_URL || 'https://smart-hospital-management-1.onrender.com';

export const imageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};
