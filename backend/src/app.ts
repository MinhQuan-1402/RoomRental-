import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './routes';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { errorMiddleware } from './middlewares/error.middleware';

const app: Application = express();

// Middleware bảo mật
app.use(helmet());

// Cấu hình CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Xử lý dữ liệu từ request body với giới hạn kích thước
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Gắn các API route vào đường dẫn /api
app.use('/api', apiRouter);

// Xử lý lỗi 404 khi không tìm thấy route phù hợp
app.use(notFoundMiddleware);

// Middleware xử lý lỗi toàn cục
app.use(errorMiddleware);

export { app };