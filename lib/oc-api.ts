import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'


export declare type OrderCloudApiRequest = NextApiRequest & {
}

export declare type OrderCloudApiResponse<T = any> = NextApiResponse & {
    proceed: (proc: boolean, sendBody?: T) => void
}

export const webhook = (fn: (OrderCloudApiRequest, OrderCloudApiResponse) => void | Promise<void>) => {
    return function(req: NextApiRequest, res: NextApiResponse) {
        const ocReq = req as OrderCloudApiRequest;
        const ocRes = res as OrderCloudApiResponse;

        console.log('future auth validation.........');

        ocRes.proceed = (p, b?) => {
            ocRes.send({ proceed: p, body: b });
        }
        
        return fn(ocReq, ocRes);
    }
}