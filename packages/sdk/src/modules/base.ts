import { AxiosInstance } from "axios";
import { LocusEmitter } from "../events";

export abstract class BaseModule {
  constructor(
    protected readonly api: AxiosInstance,
    protected readonly emitter: LocusEmitter
  ) {}
}
