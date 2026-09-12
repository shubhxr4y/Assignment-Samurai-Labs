/**
 * Serverless entry point for Vercel.
 *
 * `createApp()` builds the same Express app the long-running server uses
 * (src/server.ts) — this file only skips the `listen()` call, because on
 * Vercel the platform owns the socket and hands each request to the exported
 * handler. Deploying here and running `npm start` on a normal Node host are
 * therefore the *same* application, not two drifting copies.
 *
 * vercel.json rewrites every path to this function, so Express keeps doing its
 * own routing exactly as it does locally.
 */
import { createApp } from '../src/app.js';

export default createApp();
