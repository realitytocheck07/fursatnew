// GET /api/menu : live Rista menu for Fursat (dishes, Half/Full, sold-out, photo links). NO prices (see /api/prices).
import { guard } from '../_lib/rista/respond.js';
import { menuData } from '../_lib/rista/menu.js';
export const onRequestGet = ({ env }) => guard(env, () => menuData(env), 20);
