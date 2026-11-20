// GET /api/outlet : open | closed | call | unknown, today's hours, address/lat/lng, whether the Rista website channel exists.
import { guard } from '../_lib/rista/respond.js';
import { outletData } from '../_lib/rista/menu.js';
export const onRequestGet = ({ env }) => guard(env, () => outletData(env), 45);
