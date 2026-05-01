const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn',  emit: 'event' },
  ],
});

prisma.$on('error', (e) => logger.error('Prisma error:', e));
prisma.$on('warn',  (e) => logger.warn('Prisma warn:',  e));

module.exports = { prisma };
