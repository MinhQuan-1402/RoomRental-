import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authorizeRoles } from "../../middlewares/role.middleware";
import { tenantsController } from "./tenants.controller";

const router = Router();

// All tenant management routes require LANDLORD role.
router.use(authMiddleware, authorizeRoles("LANDLORD"));

router.get("/", tenantsController.list);
router.get("/:id", tenantsController.getOne);
router.post("/", tenantsController.create);
router.patch("/:id", tenantsController.update);
router.delete("/:id", tenantsController.remove);

export { router as tenantsRouter };
