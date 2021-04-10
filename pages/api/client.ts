import { OrderCloudApiRequest, OrderCloudApiResponse, ordercloud } from '../../lib/oc-catalyst-next'
import { Auth, Me } from 'ordercloud-javascript-sdk'

// sample client request
const handler = async (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {

    try {
        console.time('Get User');
        const me = await Me.Get(req.client);
        console.timeEnd('Get User');

        return res.status(200).json({
            clientOut: req.client,
            bearerOut: req.bearer,
            meOut: me
        });
    } catch (e) {
        return res.status(403).json(e.errors);
    }
}

export default ordercloud(handler);