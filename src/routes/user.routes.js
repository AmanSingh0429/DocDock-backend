import e from "express";
import { getUserOrgs } from "../controllers/user.controller.js";
const router = e.Router();

router.get("/", (req, res) => {
  res.json({ message: "User route" });
});
router.get("/orgs", getUserOrgs)
export default router;