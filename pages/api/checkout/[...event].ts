import { NextApiRequest, NextApiResponse } from 'next';
import { IntegrationEventApiRequest, IntegrationEventApiResponse, integrationEvent } from '../../../lib/oc-catalyst-next';
import { Auth, Me } from 'ordercloud-javascript-sdk'
import getRawBody from 'raw-body'

export const config = {
    api: {
        bodyParser: false,
    },
}

// debugger
const handler = async (req: IntegrationEventApiRequest, res: IntegrationEventApiResponse) => {
    console.log(JSON.stringify(req.query, null, 1));
    console.log(JSON.stringify(req.headers, null, 1));

    console.log('=================');
    if (req.body) {
        console.log(JSON.stringify(req.body, null, 1));
    }

    return res.status(200).send('Done');
}

export default integrationEvent(handler);