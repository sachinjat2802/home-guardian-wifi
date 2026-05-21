import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../providers/app_state.dart';

class Sidebar extends StatelessWidget {
  const Sidebar({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Container(
      width: 250,
      color: Theme.of(context).cardColor,
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Row(
              children: [
                Icon(LucideIcons.shield, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'Home Guardian',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: ListView(
              children: [
                _SidebarItem(
                  icon: LucideIcons.layout_dashboard,
                  label: 'Dashboard',
                  tabId: 'dashboard',
                  activeTab: appState.activeTab,
                  onTap: () => appState.setActiveTab('dashboard'),
                ),
                _SidebarItem(
                  icon: LucideIcons.map,
                  label: 'Floorplan',
                  tabId: 'floorplan',
                  activeTab: appState.activeTab,
                  onTap: () => appState.setActiveTab('floorplan'),
                ),
                _SidebarItem(
                  icon: LucideIcons.activity,
                  label: 'Spectrum',
                  tabId: 'spectrum',
                  activeTab: appState.activeTab,
                  onTap: () => appState.setActiveTab('spectrum'),
                ),
                _SidebarItem(
                  icon: LucideIcons.wifi,
                  label: 'Networks',
                  tabId: 'networks',
                  activeTab: appState.activeTab,
                  onTap: () => appState.setActiveTab('networks'),
                ),
                _SidebarItem(
                  icon: LucideIcons.heart_pulse,
                  label: 'Vitals',
                  tabId: 'vitals',
                  activeTab: appState.activeTab,
                  onTap: () => appState.setActiveTab('vitals'),
                ),
                _SidebarItem(
                  icon: LucideIcons.brain_circuit,
                  label: 'SNN',
                  tabId: 'snn',
                  activeTab: appState.activeTab,
                  onTap: () => appState.setActiveTab('snn'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String tabId;
  final String activeTab;
  final VoidCallback onTap;

  const _SidebarItem({
    required this.icon,
    required this.label,
    required this.tabId,
    required this.activeTab,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = tabId == activeTab;
    return ListTile(
      leading: Icon(icon, color: isActive ? Colors.blue : Colors.grey),
      title: Text(
        label,
        style: TextStyle(
          color: isActive ? Colors.blue : Colors.grey,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: isActive,
      onTap: onTap,
    );
  }
}
