/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';

dotenv.config({path: `.env.${process.env.MODE || 'development'}`});

export const config = {
  mode: process.env.MODE || 'development',

  headless: process.env.HEADLESS === 'true',
  browserlessUrl: process.env.BROWSERLESS_URL,
  stealthMode: process.env.STEALTH_MODE === 'true',

  humanBehavior: {
    minDelay: parseInt(process.env.MIN_DELAY || '300'),
    maxDelay: parseInt(process.env.MAX_DELAY || '1500'),
    preMovement: process.env.ENABLE_PRE_MOVEMENT !== 'false',
  },

  rebrowserMode:
    process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE || 'alwaysIsolated',
};
