import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'
var crypto = require('crypto')

const environment_hash_key = 'OC_WEBHOOK_KEY';

export declare type OrderCloudApiRequest = NextApiRequest & {
}

export declare type OrderCloudApiResponse<T = any> = NextApiResponse & {
    proceed: (proc: boolean, sendBody?: T) => void
}

export const webhook = (fn: (OrderCloudApiRequest, OrderCloudApiResponse) => void | Promise<void>) => {
    return function(req: NextApiRequest, res: NextApiResponse) {

        // get the hashkey
        const hashkey = process.env.environment_hash_key;
        if (!!hashkey) console.error(`Environment '${environment_hash_key}' not set`);

        // webhook validation
        const sent = Array.isArray(req.headers['X-oc-hash']) ? req.headers['X-oc-hash'][0] : req.headers['X-oc-hash'];
        if (!!sent) console.error(`Header 'X-oc-hash' not sent`);

        // get body hash
        const hash = crypto.createHash('sha256').update(req.body).digest('base64');
        if (hash != sent) console.error(`Sent hash ${sent} is not equal to message hash ${hash}`);

        // add future error handling


        // create response
        const ocReq = req as OrderCloudApiRequest;
        const ocRes = res as OrderCloudApiResponse;
        ocRes.proceed = (p, b?) => {
            ocRes.send({ proceed: p, body: b });
        }
        
        return fn(ocReq, ocRes);
    }
}