export default defineEventHandler(async (event) => {
  requireBurnairEnabled();
  const { username, password } = await readBody<{ username?: string; password?: string }>(event);
  if (!username || !password) throw createError({ statusCode: 400, statusMessage: "Benutzername und Passwort fehlen" });
  const res = await burnairLogin(username, password);
  if (!res) throw createError({ statusCode: 401, statusMessage: "Login bei Burnair fehlgeschlagen" });
  return res;
});
