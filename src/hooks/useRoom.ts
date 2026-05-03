import { useRealtimeValue } from './useRealtimeValue';
import type { Room } from '../types';

export function useRoom(roomId?: string | null) {
  return useRealtimeValue<Room>(roomId ? `rooms/${roomId}` : null);
}
