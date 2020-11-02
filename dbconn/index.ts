import { VTBDB } from './mongo_client';
import { RedisDB } from './redis_client';

const VTubersDB = new VTBDB("vtbili");
const NijiTubeDB = new VTBDB("vtniji");

export { VTubersDB, NijiTubeDB, VTBDB, RedisDB };