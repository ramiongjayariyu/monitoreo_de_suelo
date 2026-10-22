import { io } from "socket.io-client";
import { getAccessToken } from "./client";

export const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  autoConnect: false,
});

export function connectSocket(): void {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Se requiere un token de acceso para conectar el socket.");
  }

  socket.auth = { token };
  socket.connect();
}

export function disconnectSocket(): void {
  socket.disconnect();
}
