import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'facturacion-secret-key-2024';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol, sucursal_id: user.sucursal_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
