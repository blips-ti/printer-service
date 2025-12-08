const express = require('express');
const { ZKLib } = require('zklib');

const attendanceRouter = express.Router();

// Device configuration
const DEVICE_IP = '192.168.0.201';
const DEVICE_PORT = 4370;

// Initialize ZKLib instance
let zkInstance = null;

// Initialize device connection
const initializeDevice = async () => {
  try {
    if (!zkInstance) {
      zkInstance = new ZKLib(DEVICE_IP, DEVICE_PORT, 5200, 5000);
    }

    if (!zkInstance.isConnected) {
      await zkInstance.createSocket();
      console.log('Connected to ESSL biometric device');
    }

    return zkInstance;
  } catch (error) {
    console.error('Failed to connect to device:', error);
    throw new Error('Device connection failed');
  }
};

// GET /v1/attendance - Fetch all attendance logs
attendanceRouter.get('/', async (req, res) => {
  try {
    const zk = await initializeDevice();

    // Get attendance logs
    const logs = await zk.getAttendances();

    // Format the response
    const formattedLogs = logs.map(log => ({
      userId: log.userId,
      timestamp: log.timestamp,
      date: log.timestamp.toISOString().split('T')[0],
      time: log.timestamp.toTimeString().split(' ')[0],
      deviceId: log.deviceId || 'Unknown',
      status: log.status || 'Check-In'
    }));

    res.json({
      success: true,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      },
      totalRecords: formattedLogs.length,
      data: formattedLogs
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      }
    });
  }
});

// GET /v1/attendance/users - Get all users from device
attendanceRouter.get('/users', async (req, res) => {
  try {
    const zk = await initializeDevice();

    // Get users
    const users = await zk.getUsers();

    // Format the response
    const formattedUsers = users.map(user => ({
      userId: user.userId,
      name: user.name || 'Unknown',
      role: user.role || 'User',
      cardNo: user.cardNo || null,
      password: user.password ? '****' : null, // Hide password in response
      groupId: user.groupId || null
    }));

    res.json({
      success: true,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      },
      totalUsers: formattedUsers.length,
      data: formattedUsers
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      }
    });
  }
});

// GET /v1/attendance/status - Get device status
attendanceRouter.get('/status', async (req, res) => {
  try {
    const zk = await initializeDevice();

    // Get device info
    const info = await zk.getInfo();

    res.json({
      success: true,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT,
        connected: true
      },
      info: info
    });

  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT,
        connected: false
      }
    });
  }
});

// POST /v1/attendance/clear - Clear all attendance logs (use with caution)
attendanceRouter.post('/clear', async (req, res) => {
  try {
    const zk = await initializeDevice();

    // Clear attendance logs
    await zk.clearAttendanceLog();

    res.json({
      success: true,
      message: 'Attendance logs cleared successfully',
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      }
    });

  } catch (error) {
    console.error('Error clearing attendance logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      }
    });
  }
});

// GET /v1/attendance/today - Get today's attendance
attendanceRouter.get('/today', async (req, res) => {
  try {
    const zk = await initializeDevice();

    // Get all attendance logs
    const logs = await zk.getAttendances();

    // Filter for today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    const todayLogs = logs
      .filter(log => log.timestamp.toISOString().split('T')[0] === todayString)
      .map(log => ({
        userId: log.userId,
        timestamp: log.timestamp,
        time: log.timestamp.toTimeString().split(' ')[0],
        deviceId: log.deviceId || 'Unknown',
        status: log.status || 'Check-In'
      }));

    res.json({
      success: true,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      },
      date: todayString,
      totalRecords: todayLogs.length,
      data: todayLogs
    });

  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      device: {
        ip: DEVICE_IP,
        port: DEVICE_PORT
      }
    });
  }
});

// Cleanup on process exit
process.on('SIGINT', async () => {
  if (zkInstance && zkInstance.isConnected) {
    try {
      await zkInstance.disconnect();
      console.log('Disconnected from ESSL device');
    } catch (error) {
      console.error('Error disconnecting from device:', error);
    }
  }
});

process.on('SIGTERM', async () => {
  if (zkInstance && zkInstance.isConnected) {
    try {
      await zkInstance.disconnect();
      console.log('Disconnected from ESSL device');
    } catch (error) {
      console.error('Error disconnecting from device:', error);
    }
  }
});

module.exports = attendanceRouter;
