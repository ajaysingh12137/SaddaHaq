import { OtpDeliveryError, type OtpProvider } from './provider';

export interface Msg91Config {
  authKey: string;
  templateId: string;
  /** Variable name used for the code in the DLT-approved template. */
  otpVar: string;
  /** Overridable for tests. */
  endpoint?: string;
  timeoutMs?: number;
}

/**
 * MSG91 adapter using the Flow API, so the API keeps generating and hashing its
 * own OTPs. PLACEHOLDER: confirm the endpoint and payload against current MSG91
 * documentation and your DLT template before launch.
 */
export class Msg91OtpProvider implements OtpProvider {
  readonly name = 'msg91';
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: Msg91Config,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.endpoint = config.endpoint ?? 'https://control.msg91.com/api/v5/flow/';
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async send(phone: string, otp: string): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authkey: this.config.authKey,
        },
        body: JSON.stringify({
          template_id: this.config.templateId,
          short_url: '0',
          recipients: [{ mobiles: `91${phone}`, [this.config.otpVar]: otp }],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new OtpDeliveryError('MSG91 request failed', { cause: error });
    }
    if (!response.ok) {
      // Do not include the response body: it may echo the phone number.
      throw new OtpDeliveryError(`MSG91 responded with HTTP ${response.status}`);
    }
  }
}
