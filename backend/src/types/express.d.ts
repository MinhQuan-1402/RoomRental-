import { UserRole } from '../modules/users/user.types';

export interface AuthUserPayload {
  userId: string;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      // Provided by multer when using `upload.single()` / `upload.array()` etc.
      file?: Express.Multer.File;
      files?:
        | { [fieldname: string]: Express.Multer.File[] }
        | Express.Multer.File[];
    }
  }
}
