const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Health Check ---');

    // 1. Fix the rogue pharmacy in Halandri that has Patra coordinates
    const rogueId = 'ca29535e-133c-49ea-9548-de9d67ad76fa';
    const rogue = await prisma.pharmacy.findUnique({ where: { id: rogueId } });

    if (rogue && rogue.lat > 38 && rogue.lat < 39 && rogue.lng > 21 && rogue.lng < 22) {
        console.log(`Fixing rogue pharmacy: ${rogue.name} (${rogue.address})`);
        await prisma.pharmacy.update({
            where: { id: rogueId },
            data: { lat: null, lng: null }
        });
        console.log('Coordinates cleared.');
    }

    // 2. Count Achaia pharmacies with coords
    const achaiaTotal = await prisma.pharmacy.count({
        where: { OR: [{ prefecture: { contains: 'Αχα' } }, { region: { contains: 'Αχα' } }] }
    });

    const achaiaWithCoords = await prisma.pharmacy.count({
        where: {
            AND: [
                { OR: [{ prefecture: { contains: 'Αχα' } }, { region: { contains: 'Αχα' } }] },
                { lat: { not: null } }
            ]
        }
    });

    console.log(`Achaia Pharmacies: ${achaiaTotal} total, ${achaiaWithCoords} with coordinates.`);

    // 3. Find any other "Attica" pharmacies in Patra area
    // Patra is roughly 38.2, 21.7
    const mislocated = await prisma.pharmacy.findMany({
        where: {
            AND: [
                { OR: [{ prefecture: { contains: 'Αττικ' } }, { region: { contains: 'Αττικ' } }] },
                { lat: { gt: 38.1, lt: 38.4 } },
                { lng: { gt: 21.6, lt: 21.9 } }
            ]
        }
    });

    if (mislocated.length > 0) {
        console.log(`Found ${mislocated.length} other mislocated pharmacies from Attica in Patra coords. Clearing them...`);
        for (const p of mislocated) {
            console.log(` - ${p.name} (${p.address})`);
            await prisma.pharmacy.update({
                where: { id: p.id },
                data: { lat: null, lng: null }
            });
        }
    }

    // 4. List some Achaia pharmacies without coords to see if we can help
    if (achaiaWithCoords < 5) {
        const without = await prisma.pharmacy.findMany({
            where: {
                AND: [
                    { OR: [{ prefecture: { contains: 'Αχα' } }, { region: { contains: 'Αχα' } }] },
                    { lat: null }
                ]
            },
            take: 5
        });
        console.log('Sample Achaia pharmacies without coords:');
        without.forEach(p => console.log(` - ${p.name}: ${p.address}`));
    }

    await prisma.$disconnect();
}

main().catch(console.error);
