/**
 * API Types
 *
 * Utility types for cleaner Express route handlers.
 */

import type { Request } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";
import type { ParsedQs } from "qs";

/**
 * Helper to define a request with a typed body.
 * ResBody is set to Record<string, unknown> by default to satisfy ResponseBuilder.
 */
export type TypedRequest<TReqBody = Record<string, unknown>> = Request<
  ParamsDictionary,
  Record<string, unknown>,
  TReqBody,
  ParsedQs
>;

/**
 * Helper to define a request with typed params and body.
 */
export type TypedRequestWithParams<
  TParams extends ParamsDictionary,
  TReqBody = Record<string, unknown>,
> = Request<TParams, Record<string, unknown>, TReqBody, ParsedQs>;

/**
 * Helper to define a request with typed query and body.
 */
export type TypedRequestWithQuery<
  TQuery extends Query,
  TReqBody = Record<string, unknown>,
> = Request<ParamsDictionary, Record<string, unknown>, TReqBody, TQuery>;
