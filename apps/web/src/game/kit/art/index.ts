import { IS_HD } from '../../../variant';
import { pack as hd } from './hd';
import { pack as roblox } from './roblox';
import type { ArtPack } from './types';
export const art: ArtPack = IS_HD ? hd : roblox;
