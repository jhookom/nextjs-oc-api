import { Configuration, DecodedToken, OrderCloudError } from 'ordercloud-javascript-sdk'
import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'


const environment_webhook_key = 'OC_WEBHOOK_KEY';
const environment_api_url = 'OC_API_URL';
const environment_api_version = 'OC_API_VERSION';
const environment_api_client = 'OC_CLIENT_ID';

const webhook_header = 'x-oc-hash';


// initialize the OrderCloud client for API request handling
function _initClient() {
    const config = Configuration.Get();
    Configuration.Set({
        baseApiUrl: process.env[environment_api_url] || 'https://sandboxapi.ordercloud.io',
        apiVersion: process.env[environment_api_version] || config.apiVersion,
        clientID: config.clientID || process.env[environment_api_client],
    });
    console.log(`Initializing Client: ${JSON.stringify(Configuration.Get())}`);


}

// helper functions
function _dateFromISO8601(isostr: string) {
    var parts = isostr.match(/\d+/g);
    return new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3], +parts[4], +parts[5]);
}

// helper functions
function _decodeBase64(str: string) {
  return Buffer.from(str, "base64").toString("binary");
}

// helper functions
async function _parseJwt(token: string): Promise<DecodedToken> {
    const decoded = jwt.decode(token, {complete: true});

    // todo add caching
    const cert_resp = await fetch(`${decoded.payload.aud}/oauth/certs/${decoded.header.kid}`);
    const cert = await cert_resp.json();
    const pem = jwkToPem(cert);

    // will throw an exception if verification fails
    await jwt.verify(token, pem, { algorithms: ['RS256'], audience: decoded.payload.aud, issuer: decoded.payload.iss });
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

    _initClient();

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
            return res.status(403).json(`Invalid Authorization Bearer`);
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

/*
 * Helper for handling Webhook API requests from OC
 *
 */
export const webhook = (fn: (WebhookApiRequest, WebhookApiResponse) => void | Promise<void>) => {

    _initClient();

    return async function(req: NextApiRequest, res: NextApiResponse) {

        // log body
        // console.log('Header:');
        // console.log(JSON.stringify(req.headers, null, 1));
        // console.log('Body:');
        // console.log(JSON.stringify(req.body, null, 1));

        // validate webhook if environment variable set
        const hashkey = process.env[environment_webhook_key];
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