import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/app_state.dart';
import 'components/sidebar.dart';
import 'components/dashboard_view.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return MaterialApp(
      title: 'Home Guardian',
      theme: appState.currentTheme,
      home: const MainLayout(),
    );
  }
}

class MainLayout extends StatelessWidget {
  const MainLayout({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          const Sidebar(),
          Expanded(
            child: Consumer<AppState>(
              builder: (context, appState, child) {
                switch (appState.activeTab) {
                  case 'dashboard':
                    return const DashboardView();
                  // TODO: Implement other views
                  default:
                    return const DashboardView();
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
