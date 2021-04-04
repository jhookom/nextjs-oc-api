import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

const environment_webhook_key = 'OC_WEBHOOK_KEY';
const webhook_header = 'x-oc-hash';

export declare type OrderCloudApiRequest = NextApiRequest & {
    route : {
        path: string,
        params: any,
    },
    payload: any,
    configData: any,
}

export declare type OrderCloudApiResponse<T = any> = NextApiResponse & {
    proceed: (proc: boolean, sendBody?: T) => void
}

export const webhook = (fn: (OrderCloudApiRequest, OrderCloudApiResponse) => void | Promise<void>) => {
    return function(req: NextApiRequest, res: NextApiResponse) {

        // log body
        console.log('Header:');
        console.log(JSON.stringify(req.headers, null, 1));
        console.log('Body:');
        console.log(JSON.stringify(req.body, null, 1));

        // validate webhook if environment variable set
        const hashkey = process.env[environment_webhook_key];
        if (!!hashkey) {
            const sent = Array.isArray(req.headers[webhook_header]) ? req.headers[webhook_header][0] : req.headers[webhook_header];
            if (!!sent) {
                // not ideal to re-stringify the json body vs using the raw (https://github.com/vercel/next.js/discussions/13405)
                const hash = crypto.createHmac('sha256', hashkey).update(JSON.stringify(req.body)).digest('base64');
                if (hash != sent) return res.status(403).send(`Header '${webhook_header} is Not Valid`);
            } else {
                return res.status(403).send(`Header '${webhook_header}' Required`);
            }
        }

        // create request
        const ocReq = req as OrderCloudApiRequest;
        ocReq.route = { path: req.body?.Route, params: req.body?.RouteParams };
        ocReq.payload = req.body?.Request?.Body;
        ocReq.configData = req.body?.ConfigData;

        // create response
        const ocRes = res as OrderCloudApiResponse;
        ocRes.proceed = (p, b?) => {
            ocRes.send({ proceed: p, Body: b });
        }
        
        return fn(ocReq, ocRes);
    }
}