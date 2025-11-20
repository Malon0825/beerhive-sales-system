import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';
import type { PackageAvailabilityItem } from '@/data/queries/package-availability.queries';

/**
 * OfflinePackageAvailability
 *
 * Computes package availability purely from the offline catalog snapshot
 * (IndexedDB via DataBatchingService), mirroring the server-side
 * PackageAvailabilityService algorithm for max_sellable and bottleneck.
 */
export class OfflinePackageAvailability {

  /**
   * Compute availability for all packages from the offline catalog snapshot.
   */
  static async getAllPackageAvailability(): Promise<PackageAvailabilityItem[]> {
    const dataBatching = DataBatchingService.getInstance();
    const snapshot = await dataBatching.getCatalogSnapshot();

    const productsById = new Map<string, { id: string; name: string; current_stock: number | null }>(
      snapshot.products.map((p) => [p.id, { id: p.id, name: p.name, current_stock: p.current_stock }])
    );

    const results: PackageAvailabilityItem[] = [];

    for (const pkg of snapshot.packages) {
      const items = pkg.items || [];

      if (items.length === 0) {
        results.push({
          package_id: pkg.id,
          package_name: pkg.name,
          max_sellable: Infinity,
          status: 'available',
        });
        continue;
      }

      let maxSellable = Infinity;
      let bottleneckProductId: string | undefined;
      let bottleneckProductName: string | undefined;
      let bottleneckCurrentStock: number | undefined;
      let bottleneckRequiredPerPackage: number | undefined;

      for (const item of items) {
        const product = productsById.get(item.product_id);
        if (!product) {
          // Treat missing product as no stock
          if (maxSellable > 0) {
            maxSellable = 0;
            bottleneckProductId = item.product_id;
            bottleneckProductName = 'Unknown Product';
            bottleneckCurrentStock = 0;
            bottleneckRequiredPerPackage = item.quantity || 0;
          }
          continue;
        }

        const currentStock = product.current_stock ?? 0;
        const requiredPerPackage = item.quantity || 0;

        if (requiredPerPackage <= 0) {
          continue;
        }

        const maxForThisProduct = Math.floor(currentStock / requiredPerPackage);

        if (maxForThisProduct < maxSellable) {
          maxSellable = maxForThisProduct;
          bottleneckProductId = product.id;
          bottleneckProductName = product.name;
          bottleneckCurrentStock = currentStock;
          bottleneckRequiredPerPackage = requiredPerPackage;
        }
      }

      const bottleneck =
        bottleneckProductId && bottleneckProductName != null && bottleneckCurrentStock != null &&
        bottleneckRequiredPerPackage != null
          ? {
              product_id: bottleneckProductId,
              product_name: bottleneckProductName,
              current_stock: bottleneckCurrentStock,
              required_per_package: bottleneckRequiredPerPackage,
            }
          : undefined;

      results.push({
        package_id: pkg.id,
        package_name: pkg.name,
        max_sellable: maxSellable,
        bottleneck,
      });
    }

    return results;
  }
}
