import { handleProductOrder } from '@/lib/repos/order-endpoint';
import { route } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = route((request: Request) => handleProductOrder(request, 'featured_order'));
