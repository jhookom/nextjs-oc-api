import { NextApiRequest, NextApiResponse } from 'next';
import { Auth, Me } from 'ordercloud-javascript-sdk'

export const config = {
    api: {
        bodyParser: true,
    },
}

// debugger
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { event } = req.query;
    console.log(`Event ${(event as string[]).join[', ']}`);
    console.log(req.rawHeaders);
    console.log(req.body);
}

export default handler;