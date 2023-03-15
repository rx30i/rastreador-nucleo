/// <reference types="node" />
import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
import { ISocket } from '../../contracts';
import { Socket } from 'net';
declare type TcpContextArgs = [Socket, string, (imei: string) => ISocket | null];
export declare class TcpContext extends BaseRpcContext<TcpContextArgs> {
    constructor(args: TcpContextArgs);
    getSocketRef(imei?: string): ISocket | null;
    mensagem(): string;
}
export {};
