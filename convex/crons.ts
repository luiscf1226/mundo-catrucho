// Tareas programadas. Honduras va en UTC−6 todo el año: su medianoche es a las 06:00 UTC.
import { cronJobs, type FunctionReference, makeFunctionReference } from 'convex/server';

const repartir = makeFunctionReference<'mutation', { fecha?: string }>(
  'misiones:repartir',
) as unknown as FunctionReference<'mutation', 'internal', { fecha?: string }>;
const crons = cronJobs();
crons.daily('repartir misiones del dia', { hourUTC: 6, minuteUTC: 0 }, repartir, {});
export default crons;
