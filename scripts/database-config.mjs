export function validateDatasource(schema, databaseUrl) {
  const provider = schema.match(/datasource\s+db\s*\{[^}]*provider\s*=\s*"([^"]+)"/s)?.[1];
  if (provider !== "mysql") throw new Error("KOLVIA yêu cầu Prisma provider mysql.");
  if (!databaseUrl) throw new Error("Thiếu DATABASE_URL trong .env.");
  let url;
  try { url = new URL(databaseUrl); } catch { throw new Error("DATABASE_URL MySQL không hợp lệ."); }
  if (url.protocol !== "mysql:" || !url.hostname || url.pathname.length < 2) {
    throw new Error("DATABASE_URL phải là mysql://USER:PASSWORD@HOST:PORT/DATABASE.");
  }
  return provider;
}
