import { IS_HD } from '../../../variant';
import type { ArtPack } from './types';
import { pack as roblox } from './roblox';
import { pack as hd } from './hd';
export const art: ArtPack = IS_HD ? hd : roblox;
