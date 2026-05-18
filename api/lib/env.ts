export const getTursoConfig = () => {
  const url =
    process.env.TURSO_DATABASE_URL ??
    process.env.LIBSQL_URL ??
    process.env.DATABASE_URL;

  const authToken =
    process.env.TURSO_AUTH_TOKEN ??
    process.env.LIBSQL_AUTH_TOKEN ??
    process.env.TURSO_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "Missing Turso credentials. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Vercel.",
    );
  }

  return { url, authToken };
};
