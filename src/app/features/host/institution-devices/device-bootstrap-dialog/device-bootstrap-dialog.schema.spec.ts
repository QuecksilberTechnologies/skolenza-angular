import { DeviceBootstrapModel, deviceBootstrapSchema } from './device-bootstrap-dialog.schema';

const messagesFor = (model: DeviceBootstrapModel): string[] => {
  const result = deviceBootstrapSchema.safeParse(model);
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path[0] === 'lifetimeMinutes')
    .map((issue) => issue.message);
};

describe('deviceBootstrapSchema', () => {
  it('accepts the dialog default', () => {
    expect(deviceBootstrapSchema.safeParse({ lifetimeMinutes: 120 }).success).toBe(true);
  });

  it.each([5, 1440])('accepts the boundary value %i', (lifetimeMinutes) => {
    expect(deviceBootstrapSchema.safeParse({ lifetimeMinutes }).success).toBe(true);
  });

  it.each([
    [{ lifetimeMinutes: 4 }, 'Lifetime must be at least 5 minutes'],
    [{ lifetimeMinutes: 1441 }, 'Lifetime cannot exceed 1440 minutes'],
    [{ lifetimeMinutes: null }, 'Lifetime is required'],
  ])('rejects %j', (model, message) => {
    expect(messagesFor(model as DeviceBootstrapModel)).toContain(message);
  });

  it('reports the range rule before the required one, so a typed-out value explains itself', () => {
    expect(messagesFor({ lifetimeMinutes: 0 })[0]).toBe('Lifetime must be at least 5 minutes');
  });
});
