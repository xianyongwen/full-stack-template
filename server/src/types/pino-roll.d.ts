declare module "pino-roll" {
  import { DestinationStream } from "pino";
  interface PinoRollOptions {
    file: string;
    extension?: string;
    frequency?: "daily" | "hourly" | "minutely" | "monthly" | "yearly";
    mkdir?: boolean;
    size?: string;
    limit?: number;
  }
  // pino-roll v5+ 是 async 函数，返回 Promise<DestinationStream>
  export default function pinoRoll(options: PinoRollOptions): Promise<DestinationStream>;
}
