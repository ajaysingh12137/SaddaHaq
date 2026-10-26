import { OtpDeliveryError, type OtpProvider } from './provider';

export interface TextlocalConfig {
  apiKey: string;
  /** DLT-approved sender ID (6 letters), e.g. registered in Textlocal. */
  sender: string;
  /**
   * The DLT-approved template text with `{otp}` where the code goes. India's DLT
   * rules reject any SMS whose text does not match the registered template.
   */
  message: string;
  /** DLT template id, kept for reference and logs; Textlocal matches by text. */
  templateId?: string;
  /** Overridable for tests. */
  endpoint?: string;
  timeoutMs?: number;
}

interface TextlocalResponse {
  status?: string;
  errors?: { code?: number; message?: string }[];
}

/**
 * Textlocal India adapter (POST https://api.textlocal.in/send/). The API keeps
 * generating and hashing its own OTPs; Textlocal only delivers the text.
 * Textlocal answers HTTP 200 for failures too, so `status` is checked.
 */
export class TextlocalOtpProvider implements OtpProvider {
  readonly name = 'textlocal';
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: TextlocalConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.endpoint = config.endpoint ?? 'https://api.textlocal.in/send/';
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async send(phone: string, otp: string): Promise<void> {
    const body = new URLSearchParams({
      apikey: this.config.apiKey,
      numbers: `91${phone}`,
      sender: this.config.sender,
      message: this.config.message.replaceAll('{otp}', otp),
    });

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new OtpDeliveryError('Textlocal request failed', { cause: error });
    }
    if (!response.ok) {
      throw new OtpDeliveryError(`Textlocal responded with HTTP ${response.status}`);
    }

    let result: TextlocalResponse;
    try {
      result = (await response.json()) as TextlocalResponse;
    } catch (error) {
      throw new OtpDeliveryError('Textlocal sent an unreadable response', { cause: error });
    }
    if (result.status !== 'success') {
      // Only Textlocal's error codes and messages: the rest may echo the number.
      const reasons = (result.errors ?? [])
        .map(error => `${error.code ?? '?'} ${error.message ?? ''}`.trim())
        .join('; ');
      throw new OtpDeliveryError(`Textlocal rejected the SMS: ${reasons || 'unknown error'}`);
    }
  }
}
