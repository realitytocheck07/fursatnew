// GET /api/prices : { prices: { <dish id>: rupees } } from Rista (Website channel).
import { guard } from '../_lib/rista/respond.js';
import { pricesData } from '../_lib/rista/menu.js';
export const onRequestGet = ({ env }) => guard(env, () => pricesData(env), 30);
