import { OrderCloudApiRequest, OrderCloudApiResponse, ordercloud } from '../../lib/oc-catalyst-next'
import { Auth, Me } from 'ordercloud-javascript-sdk'

// sample client request
const handler = async (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {

        console.time('Get User');
        const me = await Me.Get(req.client);
        console.timeEnd('Get User');

        console.time('Fetch User');
        const resp = await fetch('https://sandboxapi.ordercloud.io/v1/me', {
            method: 'GET',
            headers: {
                'Authentication' : `Bearer ${req.client.accessToken}`
            }
        });
        console.timeEnd('Fetch User');

        return res.status(200).json({ 
            clientOut: req.client,
            bearerOut: req.bearer,
            meOut: me
        });
}

export default ordercloud(handler);