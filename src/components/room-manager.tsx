import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock data for recent rooms
const recentRooms = [
  { id: "1", name: "React Project Setup", members: 3, lastActive: "2 minutes ago", isPrivate: false },
  { id: "2", name: "API Development", members: 5, lastActive: "1 hour ago", isPrivate: true },
  { id: "3", name: "UI Components", members: 2, lastActive: "3 hours ago", isPrivate: false },
  { id: "4", name: "Database Design", members: 4, lastActive: "1 day ago", isPrivate: true },
];

export function RoomManager() {
  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  const [roomCode, setRoomCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Welcome to Your Workspace
        </h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">
          Create a new room to start collaborating or join an existing room to continue working with your team.
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Join Room Card */}
        <Card className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10 transition-all duration-200 hover:border-white/[0.12]">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Join Room</h2>
                <p className="text-white/60">Enter a room code to join an existing collaboration</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="room-code" className="text-white font-medium">Room Code</Label>
                  <Input
                    id="room-code"
                    type="text"
                    placeholder="Enter 6-digit room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="mt-2 bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all uppercase tracking-widest text-center text-lg font-mono"
                    maxLength={6}
                  />
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={roomCode.length !== 6}
                >
                  Join Room
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Room Card */}
        <Card className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10 transition-all duration-200 hover:border-white/[0.12]">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Create Room</h2>
                <p className="text-white/60">Start a new collaboration space for your team</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="room-name" className="text-white font-medium">Room Name</Label>
                  <Input
                    id="room-name"
                    type="text"
                    placeholder="My Awesome Project"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="mt-2 bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all"
                  />
                </div>
                
                <div>
                  <Label htmlFor="room-desc" className="text-white font-medium">Description (Optional)</Label>
                  <Input
                    id="room-desc"
                    type="text"
                    placeholder="Brief description of your project"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    className="mt-2 bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="private-room"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-orange-400 bg-white/[0.05] border-white/[0.1] rounded focus:ring-orange-400/20"
                  />
                  <Label htmlFor="private-room" className="text-white/80 text-sm">Make room private</Label>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!newRoomName.trim()}
                >
                  Create Room
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Rooms Section */}
      <Card className="bg-black/15 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Recent Rooms</h3>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200"
              >
                View All
              </Button>
            </div>
            
            <div className="grid gap-4">
              {recentRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-orange-400/20">
                      <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-white group-hover:text-orange-400 transition-colors">{room.name}</h4>
                        {room.isPrivate && (
                          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-white/50">
                        <span>{room.members} members</span>
                        <span>•</span>
                        <span>Active {room.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
