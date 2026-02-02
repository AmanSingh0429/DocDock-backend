export const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  return res.json({
    success: true,
    data: result,
  });
};