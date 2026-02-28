/**
 * Retry failed URLs scraper
 * Retries URLs that previously failed with 429, 503, 404, etc.
 * Run hourly via cron to gradually recover failed cities
 */

import { fetchPage } from './hybrid-fetcher';
import { parsePharmacyHtml } from './html-parser';
import { prisma } from '../db/client';
import { invalidatePattern } from '../cache/redis';
import { config } from '../config';
import { sleep } from './geocoder';

interface RetryResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

/**
 * Retry all pending failed URLs that are due for retry
 */
export async function retryFailedUrls(): Promise<RetryResult> {
  console.log('[retry] Starting failed URL retry...');

  const result: RetryResult = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  // Get all unresolved URLs that are due for retry
  const failedUrls = await prisma.failedUrl.findMany({
    where: {
      resolved: false,
      nextRetry: { lte: new Date() },
      retryCount: { lt: config.scraper.maxRetryAttempts },
    },
    orderBy: { nextRetry: 'asc' },
    take: config.scraper.retryBatchSize,
  });

  if (failedUrls.length === 0) {
    console.log('[retry] No failed URLs to retry');
    return result;
  }

  console.log(`[retry] Found ${failedUrls.length} URLs to retry`);
  result.total = failedUrls.length;

  // Group by prefecture for cache invalidation
  const prefecturesAffected = new Set<string>();

  for (const failedUrl of failedUrls) {
    console.log(`[retry] Retrying: ${failedUrl.city} (attempt ${failedUrl.retryCount + 1}/${config.scraper.maxRetryAttempts})`);

    try {
      // Fetch the page
      const { html, status } = await fetchPage(failedUrl.url);

      // Check if we got a good response
      if (status >= 200 && status < 400) {
        // Parse the pharmacy data
        const today = new Date().toISOString().split('T')[0];
        const pharmacies = parsePharmacyHtml(html, failedUrl.city, failedUrl.prefecture, today);

        if (pharmacies.length > 0) {
          // Save pharmacies (reuse existing save logic)
          for (const pharmacy of pharmacies) {
            await savePharmacySimple(pharmacy, failedUrl.prefecture);
          }

          // Mark as resolved
          await prisma.failedUrl.update({
            where: { id: failedUrl.id },
            data: {
              resolved: true,
              resolvedAt: new Date(),
            },
          });

          console.log(`[retry] ✓ ${failedUrl.city}: ${pharmacies.length} pharmacies found`);
          result.success++;
          prefecturesAffected.add(failedUrl.prefecture);
        } else {
          // Got 200 but no data - might be legitimately empty
          await prisma.failedUrl.update({
            where: { id: failedUrl.id },
            data: {
              resolved: true,
              resolvedAt: new Date(),
              errorMessage: 'Resolved with no data (page empty)',
            },
          });

          console.log(`[retry] ✓ ${failedUrl.city}: No pharmacies (page empty)`);
          result.success++;
        }
      } else {
        // Still failing - update retry count
        await updateFailedUrlRetry(failedUrl.id, failedUrl.retryCount, `HTTP ${status}`);
        result.failed++;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[retry] ✗ ${failedUrl.city}: ${errMsg}`);

      // Update retry count with backoff
      await updateFailedUrlRetry(failedUrl.id, failedUrl.retryCount, errMsg);
      result.failed++;
    }

    // Rate limit between retries (longer than normal scraping)
    await sleep(config.scraper.minDelayMs * 2);
  }

  // Invalidate cache for affected prefectures
  for (const prefecture of prefecturesAffected) {
    await invalidatePattern(`pharmacies:on-duty:${prefecture}:*`);
  }
  if (prefecturesAffected.size > 0) {
    await invalidatePattern('pharmacies:nearby:*');
  }

  console.log(`[retry] Completed: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped`);
  return result;
}

/**
 * Update a failed URL with increased retry count and backoff
 */
async function updateFailedUrlRetry(id: string, currentRetryCount: number, errorMessage: string): Promise<void> {
  const newRetryCount = currentRetryCount + 1;
  const backoffMinutes = Math.min(Math.pow(2, newRetryCount) * 15, 480); // 15m, 30m, 1h, 2h, 4h, 8h max
  const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);

  await prisma.failedUrl.update({
    where: { id },
    data: {
      retryCount: newRetryCount,
      lastAttempt: new Date(),
      nextRetry,
      errorMessage,
    },
  });

  console.log(`[retry] Next retry for this URL in ${backoffMinutes} minutes`);
}

/**
 * Simplified pharmacy save for retry (without full geocoding)
 */
async function savePharmacySimple(
  data: { name: string; address: string; phone: string | null; city: string; duties: Array<{ start: string; end: string; type: string }> },
  prefecture: string
): Promise<void> {
  try {
    // Upsert pharmacy
    const pharmacy = await prisma.pharmacy.upsert({
      where: {
        name_address_city: {
          name: data.name,
          address: data.address,
          city: data.city,
        },
      },
      update: {
        phone: data.phone,
        region: prefecture,
      },
      create: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        city: data.city,
        region: prefecture,
      },
    });

    // Save duty records
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const duty of data.duties) {
      await prisma.pharmacyDuty.upsert({
        where: {
          pharmacyId_dutyDate: {
            pharmacyId: pharmacy.id,
            dutyDate: today,
          },
        },
        update: {
          scrapedAt: new Date(),
          duties: [duty],
        },
        create: {
          pharmacyId: pharmacy.id,
          dutyDate: today,
          duties: [duty],
        },
      });
    }
  } catch (err) {
    console.error(`[retry] Failed to save pharmacy ${data.name}:`, err);
  }
}

/**
 * Get statistics about failed URLs
 */
export async function getFailedUrlStats(): Promise<{
  pending: number;
  resolved: number;
  byStatus: Record<number, number>;
  byPrefecture: Record<string, number>;
}> {
  const [pending, resolved, byStatus, byPrefecture] = await Promise.all([
    prisma.failedUrl.count({ where: { resolved: false } }),
    prisma.failedUrl.count({ where: { resolved: true } }),
    prisma.failedUrl.groupBy({
      by: ['httpStatus'],
      where: { resolved: false },
      _count: true,
    }),
    prisma.failedUrl.groupBy({
      by: ['prefecture'],
      where: { resolved: false },
      _count: true,
    }),
  ]);

  return {
    pending,
    resolved,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.httpStatus, s._count])),
    byPrefecture: Object.fromEntries(byPrefecture.map((p) => [p.prefecture, p._count])),
  };
}

/**
 * Clean up old resolved entries (keep last 7 days)
 */
export async function cleanupResolvedUrls(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.failedUrl.deleteMany({
    where: {
      resolved: true,
      resolvedAt: { lt: cutoff },
    },
  });

  if (deleted.count > 0) {
    console.log(`[retry] Cleaned up ${deleted.count} old resolved URLs`);
  }

  return deleted.count;
}
