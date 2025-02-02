import { Injectable } from '@nestjs/common';
import { pubClient as Redis } from '../redis.adapter';
import { RoomEvent } from './room.event';
import { Server, Socket } from 'socket.io';
import { IRoomRequest } from './room.interface';
import { Exception } from '../exception/exception';
import { LocalDateTime } from '@js-joda/core';
import axios from 'axios';
import { baseURL } from '../constant/url.constant';

@Injectable()
export class RoomService {
  joinRoom(client: Socket, server: Server, iRoomRequest: IRoomRequest) {
    const { uuid } = iRoomRequest;
    Redis.get(uuid, (err, data) => {
      if (err) return this.emitEventForError({ client, server }, Exception.roomCreateError);
      if (!data) {
        this.createRoom(client, iRoomRequest);
      } else {
        this.updateRoom(client, data, iRoomRequest);
      }
      this.emitEventForUserList(server, uuid);
    });
  }

  leaveRoom(client: Socket, server: Server, uuid: string) {
    Redis.get(uuid, (err, data) => {
      if (err || !data) return this.emitEventForError({ client, server }, Exception.roomNotFound);
      const findRoom = JSON.parse(data);
      const findOwnerNickname = findRoom['userList'][findRoom.owner].nickname;
      const findMyNickname = findRoom['userList'][client.id].nickname;
      if (findOwnerNickname === findMyNickname) {
        for (const userInfo of Object.entries(findRoom.userList)) {
          const socketId: string = userInfo[0];
          this.deRegisterUserBySocketID(socketId);
        }
        this.deRegisterRoom(uuid);
        this.emitEventForEmptyUserList(server, uuid);
        return;
      }
      delete findRoom['userList'][client.id];
      Redis.multi().set(uuid, JSON.stringify(findRoom)).del(client.id).exec();
      this.emitEventForUserList(server, uuid);
    });
  }

  kickRoom(client: Socket, server: Server, uuid: string, kickNickname: string) {
    Redis.get(uuid, (err, data) => {
      if (err || !data) return this.emitEventForError({ client, server }, Exception.roomNotFound);
      const findRoom = JSON.parse(data);
      const findOwnerNickname = findRoom['userList'][findRoom.owner].nickname;
      const findMyNickname = findRoom['userList'][client.id].nickname;
      if (findOwnerNickname !== findMyNickname) {
        return this.emitEventForError({ client, server }, Exception.clientUnauthorized);
      }
      for (const userInfo of Object.entries(findRoom.userList)) {
        const [socketId, socketData]: any = userInfo;
        if (socketData.nickname === kickNickname) {
          delete findRoom['userList'][socketId];
          findRoom.kickList[kickNickname] = Object({ time: LocalDateTime.now() });
          this.deRegisterUserBySocketID(socketId);
          break;
        }
      }
      this.saveRoomByUUID(uuid, findRoom);
      this.emitEventForUserList(server, uuid);
    });
  }

  removeRoom(client: Socket, server: Server, uuid: string) {
    Redis.get(uuid, (err, data) => {
      if (err || !data) return this.emitEventForError({ client, server }, Exception.roomNotFound);
      const findRoom = JSON.parse(data);
      const findOwnerNickname = findRoom['userList'][findRoom.owner].nickname;
      const findMyNickname = findRoom['userList'][client.id].nickname;
      if (findOwnerNickname === findMyNickname) {
        for (const userInfo of Object.entries(findRoom.userList)) {
          const socketId: string = userInfo[0];
          this.deRegisterUserBySocketID(socketId);
        }
        this.deRegisterRoom(uuid);
        this.emitEventForEmptyUserList(server, uuid);
      }
    });
    client.leave(uuid);
  }

  verifyRoom(client: Socket, server: Server, uuid: string, nickname: string) {
    const fromTo = { client, server };
    Redis.get(client.id, (err, data) => {
      if (err) return this.emitEventForError({ client, server }, Exception.roomVerifyError);
      if (data) {
        return this.emitEventForVerify(fromTo, false);
      }
      Redis.get(uuid, (err, data) => {
        if (err) return this.emitEventForError({ client, server }, Exception.roomVerifyError);
        if (!data) {
          return this.emitEventForVerify(fromTo, true);
        }
        const findRoom = JSON.parse(data);
        const isKickUser = findRoom.kickList[nickname];
        if (isKickUser) {
          return this.emitEventForVerify(fromTo, false);
        }
        const numberOfUsers: number = Object.keys(findRoom['userList']).length;
        if (numberOfUsers < findRoom.maxHead) {
          return this.emitEventForVerify(fromTo, true);
        }
        return this.emitEventForVerify(fromTo, false);
      });
    });
  }

  disconnectClient(client: Socket, server: Server) {
    Redis.get(client.id, (err, uuid) => {
      if (err || !uuid) return;
      Redis.get(uuid, async (err, data) => {
        if (err || !data) return;
        const findRoom = JSON.parse(data);
        const findOwnerNickname = findRoom['userList'][findRoom.owner].nickname;
        const findMyNickname = findRoom['userList'][client.id].nickname;
        if (findMyNickname === findOwnerNickname) {
          for (const userInfo of Object.entries(findRoom.userList)) {
            const socketId: string = userInfo[0];
            this.deRegisterUserBySocketID(socketId);
          }
          this.deRegisterRoom(uuid);
          await this.deleteRoomRequestToApiServer(uuid);
          this.emitEventForEmptyUserList(server, uuid);
        } else {
          for (const userInfo of Object.entries(findRoom.userList)) {
            const [socketId, socketData]: any = userInfo;
            if (socketData.nickname === findMyNickname) {
              delete findRoom['userList'][socketId];
              this.deRegisterUserBySocketID(socketId);
              break;
            }
          }
          this.saveRoomByUUID(uuid, findRoom);

          this.emitEventForUserList(server, uuid);
        }
      });
    });
  }

  registerUserBySocketID(socketID: string, uuid: string) {
    Redis.set(socketID, uuid);
  }

  deRegisterUserBySocketID(socketID: string) {
    Redis.del(socketID);
  }

  deRegisterRoom(uuid: string) {
    Redis.del(uuid);
  }

  createRoom(client: Socket, { field, img, nickname, uuid, maxHead }: IRoomRequest) {
    const newRoom = Object({ maxHead: maxHead, owner: client.id, userList: {}, kickList: {} });
    newRoom.userList = Object({ [client.id]: { nickname, img, field } });
    Redis.multi().set(uuid, JSON.stringify(newRoom)).set(client.id, uuid).exec();
  }

  updateRoom(client: Socket, roomData: string, { uuid, nickname, img, field }: IRoomRequest) {
    const findRoom = JSON.parse(roomData);
    findRoom.userList[client.id] = Object({ nickname, img, field });
    this.saveRoomByUUID(uuid, findRoom);
    Redis.multi().set(uuid, JSON.stringify(findRoom)).set(client.id, uuid).exec();
  }

  emitEventForUserList(server: Server, uuid: string) {
    Redis.get(uuid, (err, data) => {
      if (err || !data) return this.emitEventForError({ client: uuid, server }, Exception.roomNotFound);
      server.to(uuid).emit(RoomEvent.UserList, JSON.parse(data).userList);
    });
  }

  emitEventForEmptyUserList(server: Server, uuid: string) {
    server.to(uuid).emit(RoomEvent.UserList, {});
  }

  emitEventForVerify({ client, server }, isVerify: boolean) {
    server.to(client.id).emit(RoomEvent.IsVerify, isVerify);
  }

  emitEventForError({ client, server }, message) {
    server.to(client.id).emit(RoomEvent.Error, message);
  }

  // Same := registerRoom()
  saveRoomByUUID(uuid: string, roomData: any): void {
    Redis.set(uuid, JSON.stringify(roomData));
  }

  async leaveRoomRequestToApiServer(uuid): Promise<void> {
    await axios.post(`${baseURL}/api/room/socket/leave/${uuid}`, {
      headers: {
        'socket-secret-key': process.env.SOCKET_SECRET_KEY ?? '',
      },
    });
  }

  async deleteRoomRequestToApiServer(uuid): Promise<void> {
    await axios.delete(`${baseURL}/api/room/socket/${uuid}`, {
      headers: {
        'socket-secret-key': process.env.SOCKET_SECRET_KEY ?? '',
      },
    });
  }
}
