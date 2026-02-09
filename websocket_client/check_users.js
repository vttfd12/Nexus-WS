const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, email: true, createdAt: true }
        });
        console.log('--- Registered Users ---');
        console.table(users);
        if (users.length === 0) {
            console.log('No users found in database.');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
