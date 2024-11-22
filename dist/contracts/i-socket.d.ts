import { Socket } from 'node:net';
export interface ISocket extends Socket {
    id?: symbol;
    imei?: string;
}
