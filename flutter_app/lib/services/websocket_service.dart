import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;

class WifiSensingService extends ChangeNotifier {
  WebSocketChannel? _channel;
  bool _connected = false;
  String _mode = 'disconnected';

  // State from backend
  Map<String, dynamic> telemetry = {};
  Map<String, dynamic> analysis = {};
  List<dynamic> networks = [];
  Map<String, dynamic>? connectedNetwork;
  List<Map<String, dynamic>> events = [];
  List<Map<String, dynamic>> signalHistory = [];

  bool get connected => _connected;
  String get mode => _mode;

  WifiSensingService() {
    connect();
  }

  void connect() {
    try {
      final wsUrl = Uri.parse('ws://localhost:8080');
      _channel = WebSocketChannel.connect(wsUrl);

      _channel!.stream.listen(
        (message) {
          if (!_connected) {
            _connected = true;
            _mode = 'real';
            notifyListeners();
            _addEvent('Connected to Sensing Engine via WebSocket', 'system');
          }
          _handleMessage(message);
        },
        onDone: () {
          _connected = false;
          _mode = 'disconnected';
          _addEvent('Disconnected from WiFi Sensing Server. Retrying...', 'system');
          notifyListeners();
          _reconnect();
        },
        onError: (error) {
          _connected = false;
          _mode = 'disconnected';
          notifyListeners();
          // reconnection handled by onDone typically
        },
      );
    } catch (e) {
      _connected = false;
      _mode = 'disconnected';
      notifyListeners();
      _reconnect();
    }
  }

  void _reconnect() {
    Future.delayed(const Duration(seconds: 4), () {
      connect();
    });
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      final type = data['type'];

      switch (type) {
        case 'init':
          _mode = data['mode'] ?? 'real';
          break;
        case 'telemetry':
          telemetry = data;
          if (data['signal'] != null) {
            signalHistory.add({
              'signal': data['signal'],
              'baseline': data['baseline'] ?? 100,
              't': DateTime.now().millisecondsSinceEpoch,
            });
            if (signalHistory.length > 60) {
              signalHistory.removeAt(0);
            }
          }
          break;
        case 'analysis':
          analysis = data;
          break;
        case 'networks':
          networks = data['networks'] ?? [];
          break;
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Parse error: $e');
    }
  }

  void _addEvent(String msg, String type) {
    events.insert(0, {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'time': DateTime.now().toLocal().toString(),
      'msg': msg,
      'type': type,
    });
    if (events.length > 50) {
      events = events.sublist(0, 50);
    }
    notifyListeners();
  }

  // --- API Commands ---

  void requestScan() {
    _channel?.sink.add(jsonEncode({'type': 'scan'}));
  }

  void armSecurity() {
    _addEvent('🔒 Security System Armed', 'system');
    _channel?.sink.add(jsonEncode({'type': 'arm'}));
  }

  void disarmSecurity() {
    _addEvent('🔓 Security System Disarmed', 'system');
    _channel?.sink.add(jsonEncode({'type': 'disarm'}));
  }

  void triggerAlarm(String reason) {
    _addEvent('🚨 Emergency Alarm Triggered: $reason', 'alert');
    _channel?.sink.add(jsonEncode({'type': 'trigger_alarm', 'reason': reason}));
  }

  void changePreset(String preset) {
    _addEvent('📡 Preset changed to: ${preset.toUpperCase()}', 'system');
    _channel?.sink.add(jsonEncode({'type': 'preset', 'preset': preset}));
  }

  void changeMode(String newMode) {
    _addEvent('Sensing mode toggle requested: ${newMode.toUpperCase()}', 'system');
    _channel?.sink.add(jsonEncode({'type': 'mode', 'mode': newMode}));
  }

  @override
  void dispose() {
    _channel?.sink.close(status.goingAway);
    super.dispose();
  }
}
