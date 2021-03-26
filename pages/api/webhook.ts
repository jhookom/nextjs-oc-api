import { OrderCloudApiRequest, OrderCloudApiResponse, webhook } from '../../lib/oc-api'

const handler = (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {
    const body = req.body || {};

    if (!body.xp) body.xp = {};
    body.xp['nextjs-webhook-fired'] = 'yipeee';

    res.proceed(true, body);
}

export default webhook(handler);