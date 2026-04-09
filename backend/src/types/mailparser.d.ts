declare module 'mailparser' {
  import { Readable } from 'stream';

  export interface ParsedMail {
    headers?: Array<{ key: string; line: string }>;
    headerLines?: Array<{ key: string; line: string }>;
    from?: any;
    to?: any;
    subject?: string;
    text?: string;
    html?: string;
    messageId?: string;
    inReplyTo?: string;
    references?: string | string[];
    date?: Date;
  }

  export function simpleParser(rawEmail: string | Buffer | Readable): Promise<ParsedMail>;
}
