import { OrderCloudApiRequest, OrderCloudApiResponse, webhook } from '../../lib/oc-catalyst'

// generic pre-webhook
const handler = (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {
    const payload = req.payload || {};

    // override the name
    payload.Name = payload.Name + ' Webhook Added';

    // write some stuff to the body
    if (!payload.xp) payload.xp = {};
    payload.xp['nextjs-webhook-fired'] = 'yipeee';

    console.log('Response:');
    console.log(payload);

    res.proceed(true, payload)
}

export default webhook(handler);