/**
 * Script to retry failed URLs
 * Run with: npm run retry-failed
 */

import { retryFailedUrls, getFailedUrlStats, cleanupResolvedUrls } from '../src/scraper/retry-failed';

async function main() {
  console.log('=== Failed URL Retry ===\n');

  // Show stats before
  const statsBefore = await getFailedUrlStats();
  console.log('Current stats:');
  console.log(`  Pending: ${statsBefore.pending}`);
  console.log(`  Resolved: ${statsBefore.resolved}`);
  console.log(`  By HTTP status:`, statsBefore.byStatus);
  console.log('');

  // Run retry
  const result = await retryFailedUrls();

  console.log('\n=== Results ===');
  console.log(`  Total processed: ${result.total}`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Skipped: ${result.skipped}`);

  // Cleanup old entries
  await cleanupResolvedUrls();

  // Show stats after
  const statsAfter = await getFailedUrlStats();
  console.log('\nUpdated stats:');
  console.log(`  Pending: ${statsAfter.pending}`);
  console.log(`  Resolved: ${statsAfter.resolved}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Retry failed:', err);
  process.exit(1);
});
