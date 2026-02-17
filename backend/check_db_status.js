const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const date = '2026-02-10';
    console.log(`Checking data for date: ${date}`);

    const run = await prisma.scrapeRun.findFirst({
        orderBy: { startedAt: 'desc' }
    });
    console.log('Latest Scrape Run:', run);

    const results = await prisma.scrapeCityResult.findMany({
        where: {
            scrapeRunId: run.id,
            prefecture: { contains: 'Αχαΐας', mode: 'insensitive' }
        }
    });
    console.log('Results for Achaia in latest run:', results);

    const dutiesCount = await prisma.pharmacyDuty.count({
        where: { dutyDate: new Date(date) }
    });
    console.log(`Total duties in DB for ${date}: ${dutiesCount}`);

    const achaiaDuties = await prisma.pharmacyDuty.count({
        where: {
            dutyDate: new Date(date),
            pharmacy: { region: { contains: 'Αχαΐας', mode: 'insensitive' } }
        }
    });
    console.log(`Total duties for Achaia on ${date}: ${achaiaDuties}`);

    const regions = await prisma.pharmacy.findMany({
        select: { region: true },
        distinct: ['region']
    });
    console.log('Available regions in DB:', regions.map(r => r.region));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
