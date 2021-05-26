import { Configuration, DecodedToken, OrderCloudError } from 'ordercloud-javascript-sdk'
import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
import NodeCache from 'node-cache'
import axios from 'axios'

// environment variables
export const oc_env_vars = {
    webhook_key: 'OC_WEBHOOK_KEY',
    api_url: 'OC_API_URL',
    api_version: 'OC_API_VERSION',
    api_client: 'OC_CLIENT_ID',
}

export const webhook_header = 'x-oc-hash';

//
// INITIALIZE
//
 
axios.interceptors.request.use(c => {
    c['ts'] = new Date().getTime();
    return c;
});

axios.interceptors.response.use(r => {
    console.log(`${r.config.url} - ${new Date().getTime() - r.config['ts']}ms`);
    return r;
})

// initialize the OrderCloud client for API request handling
const jwk_cache = new NodeCache({
    stdTTL: 120,
    checkperiod: 240,
    useClones: false,
    maxKeys: 5
});

// instantiate the configuration for API calls based on the environment
const config = Configuration.Get();
Configuration.Set({
    baseApiUrl: _ocApiUrl(),
    apiVersion: process.env[oc_env_vars.api_version] || config.apiVersion,
    clientID: config.clientID || process.env[oc_env_vars.api_client],
});
console.log(`Initializing Client: ${JSON.stringify(Configuration.Get())}`);


//
// METHODS
//

function _ocApiUrl() : string {
    return process.env[oc_env_vars.api_url] || 'https://sandboxapi.ordercloud.io';
}

// helper functions
function _dateFromISO8601(isostr: string) {
    var parts = isostr.match(/\d+/g);
    return new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3], +parts[4], +parts[5]);
}

// helper functions
async function _parseJwt(token: string): Promise<DecodedToken> {
    const decoded = jwt.decode(token, {complete: true});
    const kid = decoded.header.kid;

    // check cache, or lookup and create a PEM for the kid header
    let pem = jwk_cache.get(kid);
    if (pem == undefined) {
        const cert_resp = await fetch(`${_ocApiUrl()}/oauth/certs/${kid}`);
        const cert = await cert_resp.json();
        pem = jwkToPem(cert);
        jwk_cache.set(kid, pem);
        console.log(`Caching JWK for kid[${kid}]`);
    }

    // will throw an exception if verification fails
    await jwt.verify(token, pem, { algorithms: ['RS256'], audience: _ocApiUrl() });
    return decoded.payload;
}

export declare type OrderCloudApiRequest<T = any> = NextApiRequest & {
    payload: T,
    bearer: DecodedToken,
    client: {
        accessToken: string
    }
}

export declare type OrderCloudApiResponse<T = any> = NextApiResponse & {
    
}

/*
 * Wrapper for proxying/middleware requests
 *
 */
export const ordercloud = (fn: (OrderCloudApiRequest, OrderCloudApiResponse) => void | Promise<void>) => {

    return async function(req: NextApiRequest, res: NextApiResponse) {

        // validate bearer
        if (!!!req.headers.authorization) return res.status(403).send(`Authorization Bearer Required`);

        // parse token
        const bearer = req.headers.authorization.split(/\s+/)[1];
        let token : DecodedToken = null;
        try {
            token = await _parseJwt(bearer);
        } catch (e) {
            console.error(e);
            return res.status(403).send(`Invalid Authorization Bearer`);
        }

        // create request
        const ocReq = req as OrderCloudApiRequest;
        ocReq.bearer = token;
        ocReq.client = { accessToken: bearer }

        // create response
        const ocRes = res as OrderCloudApiResponse;

        try {
            return fn(ocReq, ocRes);
        } catch (e) {
            console.error(e)
            if (e instanceof OrderCloudError) {
                const oe: OrderCloudError = e;
                return res.status(oe.status).send(oe.errors);
            } else {
                return res.status(500).send(`${e.name} : ${e.message}`);
            }
        }
    }
}

export declare type WebhookApiRequest<T = any> = OrderCloudApiRequest & {
    webhook : {
        path: string,
        params: any,
        verb: string,
        timestamp: Date,
        logId: string
    },
    configData: any,
}

export declare type WebhookApiResponse<T = any> = OrderCloudApiResponse & {
    proceed: (proc: boolean, sendBody?: T) => void
}

export const readBody = async (req: NextApiRequest) => {
    let buffer = '';
    
    req.on('data', (chunk) => {
        buffer += chunk;
    });

    req.on('end', () => {
        return Buffer.from(buffer).toString();
    });
}

/*
 * Helper for handling Webhook API requests from OC
 *
 */
export const webhook = (fn: (WebhookApiRequest, WebhookApiResponse) => void | Promise<void>) => {

    return async function(req: NextApiRequest, res: NextApiResponse) {

        // validate webhook if environment variable set
        const hashkey = process.env[oc_env_vars.webhook_key];
        if (!!hashkey) {
            const sent = Array.isArray(req.headers[webhook_header]) ? req.headers[webhook_header][0] : req.headers[webhook_header];
            if (!!sent) {
                // not ideal to re-stringify the json body vs using the raw (https://github.com/vercel/next.js/discussions/13405)
                const hash = crypto.createHmac('sha256', hashkey).update(JSON.stringify(req.body)).digest('base64');
                if (hash != sent) return res.status(403).send(`Header '${webhook_header} is Not Valid`);
            } else {
                return res.status(401).send(`Header '${webhook_header}' Required`);
            }
        }

        let token : DecodedToken = null;
        try {
            token = await _parseJwt(req.body?.UserToken);
        } catch (e) {
            console.error(e);
            return res.status(400).send(`Invalid Authorization Bearer`);
        }

        // create request
        const ocReq = req as WebhookApiRequest;
        if (!!req.body) {
            const b = req.body;
            const t = _dateFromISO8601(b.Date);
            ocReq.webhook = { path: b.Route, params: b.RouteParams, verb: b.Verb, timestamp: t, logId: b.LogID };
            ocReq.payload = b.Request?.Body;
            ocReq.configData = b.ConfigData;
            ocReq.bearer = token;
            ocReq.client = { accessToken: b.UserToken };
        } else {
            return res.status(400).send('Webhook Body Missing');
        }

        // create response
        const ocRes = res as WebhookApiResponse;
        ocRes.proceed = (p, b?) => {
            ocRes.send({ proceed: p, body: b });
        }
        
        try {
            return fn(ocReq, ocRes);
        } catch (e) {
            console.error(e)
            if (e instanceof OrderCloudError) {
                const oe: OrderCloudError = e;
                return ocRes.proceed(false, oe.errors);
            } else {
                return ocRes.proceed(false, { name: e.name, message: e.message });
            }
        }
    }
}