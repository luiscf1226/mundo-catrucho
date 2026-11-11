// El CLI recibe el JSON por stdin para no superar el límite de tamaño de un argumento de Linux.
import { readFileSync } from 'node:fs';

process.argv.push(readFileSync(0, 'utf8'));
