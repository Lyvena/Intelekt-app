"""
WebSocket-based real-time collaboration endpoint.

This module implements a Y.js compatible WebSocket server for real-time
collaborative editing. It manages rooms (one per file) and broadcasts
updates to all connected clients.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

router = APIRouter(prefix="/ws", tags=["collaboration"])


class ConnectionManager:
    """Manages WebSocket connections for collaborative editing."""
    
    def __init__(self):
        # Map of room_name -> set of active connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Map of connection -> room_name
        self.connection_rooms: Dict[WebSocket, str] = {}
        # Map of room_name -> document state (for syncing new clients)
        self.room_states: Dict[str, bytes] = {}
    
    async def connect(self, websocket: WebSocket, room: str):
        """Add a client to a room."""
        await websocket.accept()
        
        if room not in self.rooms:
            self.rooms[room] = set()
        
        self.rooms[room].add(websocket)
        self.connection_rooms[websocket] = room
        
        # Send current state to new client if exists
        if room in self.room_states and self.room_states[room]:
            try:
                await websocket.send_bytes(self.room_states[room])
            except Exception:
                pass
        
        # Notify others of new user
        await self.broadcast_presence(room)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a client from their room."""
        room = self.connection_rooms.get(websocket)
        if room and room in self.rooms:
            self.rooms[room].discard(websocket)
            if not self.rooms[room]:
                # Clean up empty room
                del self.rooms[room]
                if room in self.room_states:
                    del self.room_states[room]
        
        if websocket in self.connection_rooms:
            del self.connection_rooms[websocket]
    
    async def broadcast(self, room: str, data: bytes, exclude: WebSocket = None):
        """Broadcast binary data to all clients in a room."""
        if room not in self.rooms:
            return
        
        disconnected = []
        for connection in self.rooms[room]:
            if connection != exclude:
                try:
                    await connection.send_bytes(data)
                except Exception:
                    disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_presence(self, room: str):
        """Broadcast user count to all clients in room."""
        if room not in self.rooms:
            return
        
        count = len(self.rooms[room])
        message = json.dumps({"type": "presence", "count": count})
        
        for connection in self.rooms[room]:
            try:
                await connection.send_text(message)
            except Exception:
                pass
    
    def get_room_count(self, room: str) -> int:
        """Get number of clients in a room."""
        return len(self.rooms.get(room, set()))
    
    def store_state(self, room: str, state: bytes):
        """Store the latest document state for a room."""
        self.room_states[room] = state


manager = ConnectionManager()


@router.websocket("/collab/{room_name}")
async def websocket_collaboration(websocket: WebSocket, room_name: str):
    """
    WebSocket endpoint for real-time collaboration.
    
    This implements a simple relay server that:
    1. Accepts Y.js sync messages from clients
    2. Broadcasts updates to all other clients in the same room
    3. Stores the latest state for new clients joining
    
    Room naming convention: {project_id}:{file_path}
    """
    await manager.connect(websocket, room_name)
    
    try:
        while True:
            # Receive message (Y.js sync protocol uses binary)
            data = await websocket.receive()
            
            if "bytes" in data:
                # Y.js sync message - broadcast to others
                message = data["bytes"]
                
                # Store state for new clients
                manager.store_state(room_name, message)
                
                # Broadcast to all other clients in the room
                await manager.broadcast(room_name, message, exclude=websocket)
            
            elif "text" in data:
                # Handle text messages (e.g., awareness/presence)
                try:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "awareness":
                        # Broadcast awareness to others
                        await manager.broadcast(
                            room_name, 
                            data["text"].encode(), 
                            exclude=websocket
                        )
                except json.JSONDecodeError:
                    pass
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_presence(room_name)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.get("/collab/rooms")
async def list_rooms():
    """List active collaboration rooms and their user counts."""
    return {
        room: manager.get_room_count(room) 
        for room in manager.rooms
    }
