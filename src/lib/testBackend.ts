import { apiClient } from "./apiClient";

// Test script to validate backend connection
export async function testBackendConnection() {
  console.log("Testing backend connection...");

  try {
    // Test health endpoint (doesn't require auth)
    console.log("1. Testing health endpoint...");
    const health = await apiClient.checkHealth();
    console.log("✅ Health check passed:", health);

    // Test services health
    console.log("2. Testing services health...");
    const servicesHealth = await apiClient.checkServicesHealth();
    console.log("✅ Services health check passed:", servicesHealth);

    return true;
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
    return false;
  }
}

// Test authenticated endpoints (requires user to be logged in)
export async function testAuthenticatedEndpoints() {
  console.log("Testing authenticated endpoints...");

  try {
    // Test get all rooms
    console.log("1. Testing get all rooms...");
    const rooms = await apiClient.getAllRooms();
    console.log("✅ Get rooms passed:", rooms);

    return true;
  } catch (error) {
    console.error("❌ Authenticated endpoints test failed:", error);
    return false;
  }
}

// Helper function to test room creation
export async function testRoomCreation(roomName: string) {
  try {
    console.log(`Testing room creation with name: ${roomName}`);
    const result = await apiClient.createRoom(roomName);
    console.log("✅ Room creation passed:", result);
    return result.room?.id;
  } catch (error) {
    console.error("❌ Room creation failed:", error);
    return null;
  }
}

// Helper function to test room joining
export async function testRoomJoining(roomId: string) {
  try {
    console.log(`Testing room joining with ID: ${roomId}`);
    const result = await apiClient.joinRoom(roomId);
    console.log("✅ Room joining passed:", result);
    return true;
  } catch (error) {
    console.error("❌ Room joining failed:", error);
    return false;
  }
}
