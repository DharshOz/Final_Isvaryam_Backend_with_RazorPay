import jwt from 'jsonwebtoken';

export function generateTokenResponse(user) {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET || 'default_jwt_secret',
    { expiresIn: '30d' }
  );

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    address: user.address,
    phone: user.phone,
    googleSignup: user.googleSignup,
    token,
  };
}