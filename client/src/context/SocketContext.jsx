import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io('/', { withCredentials: true });

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join_user_room', { user_id: user.id });
    });

    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.id]);

  const joinListing = (listingId) => {
    socketRef.current?.emit('join_listing_room', { listing_id: listingId });
  };

  const leaveListing = (listingId) => {
    socketRef.current?.emit('leave_listing_room', { listing_id: listingId });
  };

  const on = (event, cb) => {
    socketRef.current?.on(event, cb);
    return () => socketRef.current?.off(event, cb);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinListing, leaveListing, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
