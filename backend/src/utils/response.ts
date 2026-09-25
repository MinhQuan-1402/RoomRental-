import { Response } from 'express';

export interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
}

export const sendSuccess = <T>({
  res,
  statusCode = 200,
  message = 'Operation successful',
  data,
}: ApiResponseOptions<T>): Response => {
  const responsePayload: { success: boolean; message: string; data?: T } = {
    success: true,
    message,
  };

  if (data !== undefined) {
    responsePayload.data = data;
  }

  return res.status(statusCode).json(responsePayload);
};
