import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/websocket_service.dart';
import 'radar_map.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    // Provide a dummy WifiSensingService if not provided up the tree,
    // though in a real app it should be provided above MainLayout.
    // We'll wrap it locally for the dashboard just to avoid null errors
    // in this rewrite, or you can supply it at the MaterialApp level.

    return ChangeNotifierProvider<WifiSensingService>(
      create: (_) => WifiSensingService(),
      child: const _DashboardContent(),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent();

  @override
  Widget build(BuildContext context) {
    final sensing = context.watch<WifiSensingService>();

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeader(sensing),
          const SizedBox(height: 16),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  flex: 2,
                  child: Column(
                    children: [
                      Expanded(
                        child: RadarMap(
                          telemetry: sensing.telemetry,
                          analysis: sensing.analysis,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildStatCards(sensing),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 1,
                  child: _buildRightPanel(sensing),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(WifiSensingService sensing) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black45,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Home Guardian Spatial Analytics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              Text('Live WiFi CSI sensing pipeline', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
          Row(
            children: [
              Text(sensing.connected ? 'CONNECTED' : 'OFFLINE',
                  style: TextStyle(color: sensing.connected ? Colors.cyan : Colors.red, fontWeight: FontWeight.bold)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildStatCards(WifiSensingService sensing) {
    final entities = sensing.analysis['entities'] ?? [];
    final presenceCount = (entities as List).length;

    return Row(
      children: [
        Expanded(child: _StatCard(label: 'Presence Blips', value: '$presenceCount')),
        const SizedBox(width: 12),
        const Expanded(child: _StatCard(label: 'Motion Index', value: '0')),
        const SizedBox(width: 12),
        const Expanded(child: _StatCard(label: 'Phase Respiration', value: 'N/A')),
      ],
    );
  }

  Widget _buildRightPanel(WifiSensingService sensing) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black45,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24),
      ),
      child: ListView.builder(
        itemCount: sensing.events.length,
        itemBuilder: (context, index) {
          final event = sensing.events[index];
          return ListTile(
            title: Text(event['msg'] ?? '', style: const TextStyle(fontSize: 12)),
            subtitle: Text(event['time'] ?? '', style: const TextStyle(fontSize: 10, color: Colors.cyan)),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;

  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black45,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.cyan)),
        ],
      ),
    );
  }
}
