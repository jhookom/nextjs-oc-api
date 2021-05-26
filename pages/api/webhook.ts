import { webhook, WebhookApiRequest, WebhookApiResponse } from '../../lib/oc-catalyst-next'
import { Buyer } from 'ordercloud-javascript-sdk'

// generic pre-webhook
const handler = async (req: WebhookApiRequest<Partial<Buyer>>, res: WebhookApiResponse) => {
    const payload = req.payload || {};

    console.log('Webhook:');
    console.log(req.webhook);

    return res.proceed(true, req.webhook)
}

export default webhook(handler);