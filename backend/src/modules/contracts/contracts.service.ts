import path from 'path';
import fs from 'fs/promises';
import { contractsRepository, ContractsRepository } from './contracts.repository';
import { AppError } from '../../utils/app-error';
import { MyActiveContract, ContractFileInfo } from './contracts.types';

// ─── Storage config ────────────────────────────────────────────────────────────
// Resolve paths relative to backend root, not cwd, so the same code works in
// dev (nodemon) and prod (compiled dist).
const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..');
const FILE_STORAGE_DIR = path.join(BACKEND_ROOT, 'storage', 'contracts');

// 10MB — matches frontend upload limit
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Whitelist — only PDF is allowed
export const ALLOWED_MIME_TYPES = new Set(['application/pdf']);

export class ContractsService {
  constructor(private repo: ContractsRepository = contractsRepository) {}

  /**
   * List all contracts owned by the given landlord.
   * Returns a normalized shape suitable for the landlord contracts page.
   */
  async listContractsForLandlord(landlordId: number) {
    const rows = await this.repo.listContractsForLandlord(landlordId);
    return rows.map((c) => ({
      id: c.id,
      roomId: c.room.id,
      roomNumber: c.room.roomNumber,
      roomAddress: c.room.address,
      tenantId: c.tenant.id,
      tenantName: c.tenant.fullName,
      tenantPhone: c.tenant.phone,
      startDate: c.startDate,
      endDate: c.endDate,
      rentPrice: Number(c.rentPrice),
      deposit: Number(c.deposit),
      billingDay: c.billingDay,
      status: c.status,
      fileName: c.fileName,
      fileVersion: c.fileVersion,
      fileUploadedAt: c.fileUploadedAt,
    }));
  }

  /**
   * Get the ACTIVE contract for the user that is currently logged in.
   * Returns null if the user has no tenant record or no active contract.
   */
  async getMyActiveContract(userId: number): Promise<MyActiveContract | null> {
    const contract = await this.repo.findActiveContractByUserId(userId);
    if (!contract) return null;

    return {
      id: contract.id,
      startDate: contract.startDate,
      endDate: contract.endDate,
      rentPrice: Number(contract.rentPrice),
      deposit: Number(contract.deposit),
      billingDay: contract.billingDay,
      status: contract.status,
      terms: contract.terms,
      room: {
        ...contract.room,
        area: contract.room.area ? Number(contract.room.area) : null,
      },
      tenant: contract.tenant,
      fileName: contract.fileName,
      fileMimeType: contract.fileMimeType,
      fileSize: contract.fileSize,
      fileVersion: contract.fileVersion,
      fileUploadedAt: contract.fileUploadedAt,
    };
  }

  /**
   * Upload (or replace) the contract file.
   *
   * Permissions:
   *   - Only the landlord who OWNS the contract may upload.
   *   - Tenant cannot upload.
   *
   * Storage:
   *   - Files live under storage/contracts/{contractId}_v{version}.pdf
   *   - Older versions are kept on disk for audit.
   *   - Multer already saved the new file to `dest` with a temp name; we rename
   *     it to the final versioned name here so partial failures don't leave
   *     dangling temp files.
   */
  async uploadContractFile(params: {
    contractId: number;
    userId: number;
    file: Express.Multer.File;
  }): Promise<ContractFileInfo> {
    const { contractId, userId, file } = params;

    // ─── Permission check ────────────────────────────────────────────────
    const contract = await this.repo.findContractById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404, 'CONTRACT_NOT_FOUND');
    }
    if (contract.landlordId !== userId) {
      throw new AppError(
        'Bạn không có quyền upload hợp đồng này',
        403,
        'FORBIDDEN'
      );
    }

    // ─── Mimetype whitelist (defense in depth — multer also checks) ──────
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      // Cleanup temp file multer already wrote
      await fs.unlink(file.path).catch(() => {});
      throw new AppError(
        'Chỉ chấp nhận file PDF',
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // ─── Ensure storage dir exists ──────────────────────────────────────
    await fs.mkdir(FILE_STORAGE_DIR, { recursive: true });

    // ─── Compute next version ──────────────────────────────────────────
    const nextVersion = (contract.fileVersion ?? 0) + 1;
    const finalName = `${contractId}_v${nextVersion}.pdf`;
    const finalPath = path.join(FILE_STORAGE_DIR, finalName);

    // ─── Move multer's temp file to its final name ─────────────────────
    try {
      await fs.rename(file.path, finalPath);
    } catch (err) {
      // If rename fails (e.g. cross-device), fall back to copy + unlink
      await fs.copyFile(file.path, finalPath).catch(async () => {
        await fs.unlink(file.path).catch(() => {});
        throw new AppError('Không thể lưu file hợp đồng', 500, 'STORAGE_ERROR');
      });
      await fs.unlink(file.path).catch(() => {});
    }

    // ─── Persist metadata ───────────────────────────────────────────────
    const updated = await this.repo.updateContractFile(contractId, {
      fileName: file.originalname,
      fileMimeType: file.mimetype,
      fileSize: file.size,
      fileVersion: nextVersion,
      fileUploadedAt: new Date(),
    });

    return {
      contractId: updated.id,
      fileName: updated.fileName!,
      fileMimeType: updated.fileMimeType!,
      fileSize: updated.fileSize!,
      fileVersion: updated.fileVersion,
      fileUploadedAt: updated.fileUploadedAt!,
      downloadUrl: `/api/contracts/${contractId}/file/download`,
    };
  }

  /**
   * Return metadata for the contract's current file.
   * Both landlord and tenant of the contract may access this.
   */
  async getContractFileInfo(params: {
    contractId: number;
    userId: number;
  }): Promise<ContractFileInfo | null> {
    const { contractId, userId } = params;

    const contract = await this.repo.findContractById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404, 'CONTRACT_NOT_FOUND');
    }

    // Ownership: landlord OR tenant (whose Tenant.userId matches)
    const isLandlord = contract.landlordId === userId;
    const isTenant = contract.tenant.userId === userId;
    if (!isLandlord && !isTenant) {
      throw new AppError(
        'Bạn không có quyền xem hợp đồng này',
        403,
        'FORBIDDEN'
      );
    }

    if (!contract.fileName || !contract.fileMimeType || !contract.fileSize) {
      return null;
    }

    return {
      contractId: contract.id,
      fileName: contract.fileName,
      fileMimeType: contract.fileMimeType,
      fileSize: contract.fileSize,
      fileVersion: contract.fileVersion,
      fileUploadedAt: contract.fileUploadedAt!,
      downloadUrl: `/api/contracts/${contractId}/file/download`,
    };
  }

  /**
   * Stream the file back to the caller.
   * Returns { filePath, fileName, mimeType } on success.
   * Throws AppError(404) if no file has been uploaded yet.
   */
  async getContractFileForDownload(params: {
    contractId: number;
    userId: number;
  }): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const { contractId, userId } = params;

    const contract = await this.repo.findContractById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404, 'CONTRACT_NOT_FOUND');
    }

    const isLandlord = contract.landlordId === userId;
    const isTenant = contract.tenant.userId === userId;
    if (!isLandlord && !isTenant) {
      throw new AppError(
        'Bạn không có quyền tải hợp đồng này',
        403,
        'FORBIDDEN'
      );
    }

    if (!contract.fileName || !contract.fileMimeType || !contract.fileVersion) {
      throw new AppError(
        'Chưa có file hợp đồng nào được upload',
        404,
        'NO_FILE_UPLOADED'
      );
    }

    const filePath = path.join(
      FILE_STORAGE_DIR,
      `${contractId}_v${contract.fileVersion}.pdf`
    );

    // Verify the file actually exists on disk (could have been deleted out-of-band)
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError(
        'File hợp đồng không tồn tại trên server',
        404,
        'FILE_MISSING'
      );
    }

    return {
      filePath,
      fileName: contract.fileName,
      mimeType: contract.fileMimeType,
    };
  }
}

export const contractsService = new ContractsService();
