import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

const environment_webhook_key = 'OC_WEBHOOK_KEY';
const webhook_header = 'x-oc-hash';

export declare type OrderCloudApiRequest = NextApiRequest & {
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

        // get the hashkey
        const hashkey = process.env[environment_webhook_key];
        if (!!hashkey == false) console.error(`Environment '${environment_webhook_key}' not set`);

        // webhook validation
        const sent = Array.isArray(req.headers[webhook_header]) ? req.headers[webhook_header][0] : req.headers[webhook_header];
        if (!!sent == false) console.error(`Header '${webhook_header}' not sent in request`);

        // get body hash based on hashkey
        const hash = crypto.createHmac('sha256', hashkey).update(JSON.stringify(req.body)).digest('base64');
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