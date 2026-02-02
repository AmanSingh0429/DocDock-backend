import { loginService } from "../../src/services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const login = async (req, res) => {
  const { email, password } = await req.body;

  const result = await loginService(email, password);

  res.json(new ApiResponse(200, "Login successful", result));
}