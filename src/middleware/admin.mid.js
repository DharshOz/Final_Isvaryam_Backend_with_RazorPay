import { UNAUTHORIZED } from '../constants/httpStatus.js';
import authMid from './auth.mid.js';

const adminMid = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(UNAUTHORIZED).json({ message: 'Not authorized as admin' });
  }
  next();
};

export default [authMid, adminMid];