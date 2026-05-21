import 'package:flutter/material.dart';

class AppState extends ChangeNotifier {
  String _activeTab = 'dashboard';
  String get activeTab => _activeTab;

  void setActiveTab(String tab) {
    _activeTab = tab;
    notifyListeners();
  }

  String _theme = 'classic';
  String get theme => _theme;

  void setTheme(String newTheme) {
    _theme = newTheme;
    notifyListeners();
  }

  ThemeData get currentTheme {
    switch (_theme) {
      case 'space':
        return ThemeData.dark().copyWith(
          scaffoldBackgroundColor: Colors.black,
          primaryColor: Colors.deepPurple,
        );
      case 'classic':
      default:
        return ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF1E1E1E),
          primaryColor: Colors.green,
        );
    }
  }
}
