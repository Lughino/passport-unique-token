import { Strategy } from 'passport-strategy';
import express from 'express';
import { lookup } from './utils';

type DoneCallback = (err: Error | null, user?: unknown, info?: unknown) => void;
export type VerifyFunctionWithRequest = (req: express.Request, token: string, done: DoneCallback) => void;
export type VerifyFunction = (token: string, done: DoneCallback) => void;
export interface UniqueTokenOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  tokenField?: string;
  tokenQuery?: string;
  tokenParams?: string;
  tokenHeader?: string;
  passReqToCallback?: false;
  caseSensitive?: boolean;
  failOnMissing?: boolean;
}

export interface UniqueTokenOptionsWithRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  tokenField?: string;
  tokenQuery?: string;
  tokenParams?: string;
  tokenHeader?: string;
  passReqToCallback: true;
  caseSensitive?: boolean;
  failOnMissing?: boolean;
}
export interface UniqueTokenAuthenticateOptions {
  badRequestMessage?: string;
}

const BAD_REQUEST = 400;

/**
 * `Strategy` class.
 *
 * The token authentication strategy authenticates requests based on the
 * credentials submitted through standard request headers, body, querystring or params.
 *
 * Applications must supply a `verify` callback which accepts
 * unique `token` credentials, and then calls the `done` callback supplying a
 * `user`, which should be set to `false` if the credentials are not valid.
 * If an exception occured, `err` should be set.
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *
 *   - `tokenField`  field name where the token is found, defaults to 'token'
 *   - `tokenQuery`  query string name where the token is found, defaults to 'token'
 *   - `tokenParams`  params name where the token is found, defaults to 'token'
 *   - `tokenHeader`  header name where the token is found, defaults to 'token'
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *   - `failOnMissing`  when `false`, if the token is not found it will not fail (default: `true`)
 *   - `caseSensitive`  when `true` the token validation is case Sensitive (default: `false`)
 *
 * Examples:
 *
 *     passport.use(new UniqueTokenStrategy(
 *       function(token, done) {
 *         User.findOne({ token: token }, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {UniqueTokenOptions | UniqueTokenOptionsWithRequest} options
 * @param {VerifyFunction | VerifyFunctionWithRequest} verify
 * @api public
 */
export class UniqueTokenStrategy extends Strategy {
  public name = 'token';
  private defaultToken = 'token';
  private tokenField: string;
  private tokenQuery: string;
  private tokenParams: string;
  private tokenHeader: string;
  private failOnMissing: boolean;
  private passReqToCallback: boolean;
  private verify: VerifyFunctionWithRequest | VerifyFunction;

  public constructor(options: UniqueTokenOptionsWithRequest, verify: VerifyFunctionWithRequest);
  public constructor(options: UniqueTokenOptions, verify: VerifyFunction);
  public constructor(verify: VerifyFunction);
  public constructor(
    options: UniqueTokenOptionsWithRequest | UniqueTokenOptions | VerifyFunctionWithRequest | VerifyFunction,
    verify?: VerifyFunctionWithRequest | VerifyFunction,
  ) {
    super();
    if (typeof options === 'function') {
      verify = options;
      options = {};
    }
    if (!verify) {
      throw new TypeError('Token authentication strategy requires a verify function');
    }

    this.tokenField = this.sanitizeToken(options, 'tokenField');
    this.tokenQuery = this.sanitizeToken(options, 'tokenQuery');
    this.tokenParams = this.sanitizeToken(options, 'tokenParams');
    this.tokenHeader = this.sanitizeToken(options, 'tokenHeader');
    this.failOnMissing = typeof options.failOnMissing !== 'undefined' ? !!options.failOnMissing : true;
    this.verify = verify;
    this.passReqToCallback = !!options.passReqToCallback;
  }

  public authenticate(req: express.Request, options: UniqueTokenAuthenticateOptions = {}): void {
    const token =
      lookup(req.body, this.tokenField) ||
      lookup(req.query, this.tokenQuery) ||
      lookup(req.params, this.tokenParams) ||
      lookup(req.headers, this.tokenHeader);

    if (!token) {
      return this.failOnMissing
        ? this.fail({ message: options.badRequestMessage || 'Missing credentials' }, BAD_REQUEST)
        : this.pass();
    }

    const verifiedCallback: DoneCallback = (err, user, info) => {
      if (err) {
        return this.error(err);
      }
      if (!user) {
        return this.fail(info, 401);
      }

      return this.success(user, info);
    };

    try {
      return this.passReqToCallback
        ? (this.verify as VerifyFunctionWithRequest)(req, token, verifiedCallback)
        : (this.verify as VerifyFunction)(token, verifiedCallback);
    } catch (e) {
      return this.error(e);
    }
  }

  private sanitizeToken(options: UniqueTokenOptions | UniqueTokenOptionsWithRequest, optionsField: string): string {
    const token = options[optionsField];
    if (!token) return this.defaultToken;

    return options.caseSensitive ? token : token.toLowerCase();
  }
}
