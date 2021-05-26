import { NextApiRequest, NextApiResponse } from 'next';
import { Auth, Me } from 'ordercloud-javascript-sdk'
import getRawBody from 'raw-body'

export const config = {
    api: {
        bodyParser: false,
    },
}

// debugger
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    console.log(JSON.stringify(req.query, null, 1));
    console.log(JSON.stringify(req.headers, null, 1));

    console.log('=================');
    if (req.body) {
        console.log(JSON.stringify(req.body, null, 1));
    } else {
        console.log(await getRawBody(req));
    }
    

    res.status(200).send('Done');
}

export default handler;