// Zona explorable de un departamento. Se genera por datos: bioma + lugar emblemático (ver zones/ y zone.tsx).
import { DeptScene } from './DeptScene';

export function Department({ id }: { id: string }) { return <DeptScene id={id} />; }
