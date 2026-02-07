
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const date = '2026-02-07';
    const pharmacies = await prisma.pharmacy.findMany({
        where: {
            duties: { some: { dutyDate: new Date(date) } },
            region: { contains: 'Αχαΐας', mode: 'insensitive' }
        },
        include: {
            duties: { where: { dutyDate: new Date(date) } }
        }
    });

    console.log(`Found ${pharmacies.length} pharmacies on duty in Achaia for ${date}`);

    // Find which ones are currently "open" (overnight)
    const overnight = pharmacies.filter(p => {
        const slots = p.duties[0].duties;
        return slots.some(s => {
            const endHour = parseInt(s.end.split(':')[0]);
            return endHour < 8 || endHour >= 23; // Simple overnight check
        });
    });

    console.log('\nOVERNIGHT PHARMACIES:');
    overnight.forEach(p => {
        console.log(`- ${p.name} | ${p.address} | ${p.city} | ${JSON.stringify(p.duties[0].duties)}`);
    });

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
