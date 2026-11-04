import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SensorContext = createContext(null);

export const SensorProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState('DISCONNECTED'); // CONNECTED | DISCONNECTED | RECONNECTING
  const [piConnected, setPiConnected] = useState(false);
  const [piLastSeen, setPiLastSeen] = useState(null);
  const [monitoringMode, setMonitoringMode] = useState('ON');

  const [sensorState, setSensorState] = useState({
    dht11: { temperature: null, humidity: null, status: 'OFFLINE', lastUpdate: null },
    mq2: { rawAdc: null, detectionState: 'UNKNOWN', status: 'OFFLINE', lastUpdate: null },
    pir: { state: 'UNKNOWN', status: 'OFFLINE', lastUpdate: null },
    adxl335: { x: null, y: null, z: null, movementState: 'UNKNOWN', status: 'OFFLINE', lastUpdate: null },
    entranceReed: { state: 'UNKNOWN', lastChange: null, status: 'OFFLINE', lastUpdate: null },
    vaultReed: { state: 'UNKNOWN', lastChange: null, status: 'OFFLINE', lastUpdate: null },
    ultrasonic: { distanceCm: null, detectionState: 'UNKNOWN', status: 'OFFLINE', lastUpdate: null },
    rfid: { lastScan: null, status: 'OFFLINE', lastUpdate: null },
    entranceServo: { lastCommand: null, commandResult: 'UNKNOWN', lastUpdate: null },
    vaultServo: { lastCommand: null, commandResult: 'UNKNOWN', lastUpdate: null },
  });

  const [alerts, setAlerts] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      setSocketStatus('CONNECTED');
    });

    newSocket.on('disconnect', () => {
      setSocketStatus('DISCONNECTED');
    });

    newSocket.on('reconnect_attempt', () => {
      setSocketStatus('RECONNECTING');
    });

    newSocket.on('sensor:update', (data) => {
      if (data) {
        setSensorState((prev) => ({ ...prev, ...data }));
        if (data.piConnected !== undefined) setPiConnected(data.piConnected);
        if (data.piLastSeen !== undefined) setPiLastSeen(data.piLastSeen);
        if (data.monitoringMode !== undefined) setMonitoringMode(data.monitoringMode);
      }
    });

    newSocket.on('pi:status', (data) => {
      if (data) {
        setPiConnected(data.connected);
        setPiLastSeen(data.lastSeen);
      }
    });

    newSocket.on('system:monitoring_mode', (data) => {
      if (data && data.mode) {
        setMonitoringMode(data.mode);
      }
    });

    newSocket.on('alert:new', (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
      if (newAlert.severity === 'CRITICAL' || newAlert.severity === 'HIGH') {
        toast.error(`[${newAlert.severity}] ${newAlert.description}`, { duration: 6000 });
      } else {
        toast(`[${newAlert.severity}] ${newAlert.description}`, { icon: '⚠️' });
      }
    });

    newSocket.on('alert:updated', (updatedAlert) => {
      setAlerts((prev) => prev.map((a) => (a.alertId === updatedAlert.alertId ? updatedAlert : a)));
    });

    newSocket.on('event:new', (newEvent) => {
      setRecentEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  return (
    <SensorContext.Provider
      value={{
        socket,
        socketStatus,
        piConnected,
        piLastSeen,
        monitoringMode,
        sensorState,
        alerts,
        activeAlerts,
        recentEvents,
        setAlerts,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
};

export const useSensor = () => useContext(SensorContext);

