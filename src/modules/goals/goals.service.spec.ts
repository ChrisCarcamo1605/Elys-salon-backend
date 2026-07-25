import { GoalsService } from './goals.service';
import { ResetPeriod } from '../../common/enums';

/**
 * Los cortes de período deben caer en la medianoche de El Salvador (UTC-6),
 * no en la del proceso ni en la UTC. Con TZ=UTC en el runner, un cálculo hecho
 * con `new Date(y, m, d)` daría 06:00Z en vez de 06:00Z del día correcto — y
 * una venta de las 7pm del último día del mes se contaría en el mes siguiente.
 */
describe('GoalsService.getPeriodStart', () => {
  const service = new GoalsService(
    null as any,
    null as any,
    null as any,
    null as any,
  );
  const periodStart = (now: string, period: ResetPeriod): string =>
    (service as any).getPeriodStart(new Date(now), period).toISOString();

  it('reinicia diario a medianoche local', () => {
    // 2026-07-25 03:00Z = 2026-07-24 21:00 en El Salvador → el día local es 24.
    expect(periodStart('2026-07-25T03:00:00Z', ResetPeriod.DAILY)).toBe(
      '2026-07-24T06:00:00.000Z',
    );
    // 2026-07-25 18:00Z = 2026-07-25 12:00 local.
    expect(periodStart('2026-07-25T18:00:00Z', ResetPeriod.DAILY)).toBe(
      '2026-07-25T06:00:00.000Z',
    );
  });

  it('reinicia mensual el día 1 local', () => {
    expect(periodStart('2026-07-25T18:00:00Z', ResetPeriod.MONTHLY)).toBe(
      '2026-07-01T06:00:00.000Z',
    );
    // 2026-08-01 02:00Z sigue siendo 31 de julio local: el mes no ha cerrado.
    expect(periodStart('2026-08-01T02:00:00Z', ResetPeriod.MONTHLY)).toBe(
      '2026-07-01T06:00:00.000Z',
    );
  });

  it('reinicia quincenal el 1 y el 16 local', () => {
    expect(periodStart('2026-07-15T18:00:00Z', ResetPeriod.BIWEEKLY)).toBe(
      '2026-07-01T06:00:00.000Z',
    );
    expect(periodStart('2026-07-16T18:00:00Z', ResetPeriod.BIWEEKLY)).toBe(
      '2026-07-16T06:00:00.000Z',
    );
    // 2026-07-16 03:00Z = 15 de julio local → aún la primera quincena.
    expect(periodStart('2026-07-16T03:00:00Z', ResetPeriod.BIWEEKLY)).toBe(
      '2026-07-01T06:00:00.000Z',
    );
  });

  it('sin reinicio acumula desde el origen', () => {
    expect(periodStart('2026-07-25T18:00:00Z', ResetPeriod.NONE)).toBe(
      '1970-01-01T00:00:00.000Z',
    );
  });
});
