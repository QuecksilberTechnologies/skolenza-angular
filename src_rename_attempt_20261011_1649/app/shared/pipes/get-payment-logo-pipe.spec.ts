import { GetPaymentLogoPipe } from './get-payment-logo-pipe';

describe('GetPaymentLogoPipe', () => {
  const pipe = new GetPaymentLogoPipe();

  it('resolves a known bank name to its logo URL', () => {
    expect(pipe.transform('HDFC Bank')).toContain('/64/hdfc.png');
    expect(pipe.transform('State Bank of India')).toContain('/64/sbi.png');
  });

  it('resolves UPI to the BHIM UPI logo', () => {
    expect(pipe.transform('UPI')).toContain('/upi/64/bhim.png');
  });

  it('returns null for an unknown name', () => {
    expect(pipe.transform('Foo Bar Bank')).toBeNull();
  });

  it('returns null for an empty name', () => {
    expect(pipe.transform('')).toBeNull();
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
  });
});
