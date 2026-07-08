const { PrismaClient } = require('@prisma/client');

// Legacy compatibility entrypoint: the project now uses Prisma + DATABASE_URL.
const prisma = new PrismaClient();

module.exports = prisma;
