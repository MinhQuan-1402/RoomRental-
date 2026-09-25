import { NextFunction, Request, Response } from "express";
import { tenantsService } from "./tenants.service";
import {
  createTenantSchema,
  listTenantsQuerySchema,
  tenantIdParamSchema,
  updateTenantSchema,
} from "./tenants.types";

export const tenantsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = req.user!.userId;
      const query = listTenantsQuerySchema.parse(req.query);
      const result = await tenantsService.list(landlordId, query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = req.user!.userId;
      const { id } = tenantIdParamSchema.parse(req.params);
      const tenant = await tenantsService.getOne(landlordId, id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người thuê",
        });
      }
      res.json({ success: true, data: tenant });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = req.user!.userId;
      const body = createTenantSchema.parse(req.body);
      const created = await tenantsService.create(landlordId, body);
      res.status(201).json({
        success: true,
        message: "Tạo người thuê thành công",
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = req.user!.userId;
      const { id } = tenantIdParamSchema.parse(req.params);
      const body = updateTenantSchema.parse(req.body);
      const updated = await tenantsService.update(landlordId, id, body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người thuê",
        });
      }
      res.json({
        success: true,
        message: "Cập nhật thành công",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = req.user!.userId;
      const { id } = tenantIdParamSchema.parse(req.params);
      const result = await tenantsService.remove(landlordId, id);
      if (!result.ok) {
        return res.status(409).json({
          success: false,
          message: result.reason,
          meta: { contractsCount: result.contractsCount },
        });
      }
      res.json({ success: true, message: "Đã xóa người thuê" });
    } catch (err) {
      next(err);
    }
  },
};
