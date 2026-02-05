import Router from "express";
import { getUserOrgs } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "User route" });
});
router.get("/orgs", authMiddleware, getUserOrgs)
export default router;