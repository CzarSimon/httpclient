export function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = this.now();
  }

  public stop(): number {
    return this.now() - this.startTime;
  }

  private now(): number {
    return new Date().getTime();
  }
}
