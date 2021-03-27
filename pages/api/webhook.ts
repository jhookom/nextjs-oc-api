import { OrderCloudApiRequest, OrderCloudApiResponse, webhook } from '../../lib/oc-catalyst'

// generic pre-webhook
const handler = (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {
    const body = req.body || {};

    // write some stuff to the body
    if (!body.xp) body.xp = {};
    body.xp['nextjs-webhook-fired'] = 'yipeee';

    res.proceed(true, body);
}

export default webhook(handler);