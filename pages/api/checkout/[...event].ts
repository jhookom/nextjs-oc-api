import { NextApiRequest, NextApiResponse } from 'next';
import { Auth, Me } from 'ordercloud-javascript-sdk'

export const config = {
    api: {
        bodyParser: true,
    },
}

// debugger
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    console.log(JSON.stringify(req.query, null, 1));
    console.log(JSON.stringify(req.headers, null, 1));

    console.log('=================');
    console.log(req.body);

    res.status(200).send('Done');
}

export default handler;