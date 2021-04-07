import { OrderCloudApiRequest, OrderCloudApiResponse, ordercloud } from '../../lib/oc-catalyst'
import { Auth, Me } from 'ordercloud-javascript-sdk'

// sample client request
const handler = async (req: OrderCloudApiRequest, res: OrderCloudApiResponse) => {
    const requestTime = new Date().getTime();

    console.log(req.client);

    try {
        const me = await Me.Get(req.client);

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