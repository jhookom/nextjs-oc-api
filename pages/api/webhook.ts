import { OrderCloudApiRequest, OrderCloudApiResponse, webhook } from '../../lib/oc-catalyst'

// generic pre-webhook
const handler = (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {
    const payload = req.payload || {};

    // write some stuff to the body
    if (!payload.xp) payload.xp = {};
    payload.xp['nextjs-webhook-fired'] = 'yipeee';

    res.proceed(false, { message: 'this is an error', success: 'false' });
}

export default webhook(handler);