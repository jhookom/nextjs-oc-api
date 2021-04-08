import { NextApiRequest, NextApiResponse } from 'next';
import { Auth, Me } from 'ordercloud-javascript-sdk'

// generic pre-webhook
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { user, client, password } = req.query;

    const token = await Auth.Login(`${user}`, `${password}`, `${client}`, [ 'FullAccess' ]);

    return res.status(200).json({ u: user, c: client, p: password, t: token });
}

export default handler;