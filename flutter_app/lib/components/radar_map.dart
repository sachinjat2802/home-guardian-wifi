import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class RadarMap extends StatelessWidget {
  final Map<String, dynamic> telemetry;
  final Map<String, dynamic> analysis;

  const RadarMap({
    super.key,
    required this.telemetry,
    required this.analysis,
  });

  @override
  Widget build(BuildContext context) {
    // Generate dummy data if analysis['entities'] is not available
    List<dynamic> entities = analysis['entities'] ?? [];

    List<ScatterSpot> scatterSpots = entities.map((e) {
      double x = (e['x'] ?? 0).toDouble();
      double y = (e['y'] ?? 0).toDouble();
      return ScatterSpot(x, y, dotPainter: FlDotCirclePainter(radius: 6, color: Colors.cyan));
    }).toList();

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
          const Text(
            'SPATIAL RADAR',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
              color: Colors.cyan,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ScatterChart(
              ScatterChartData(
                scatterSpots: scatterSpots,
                minX: -10,
                maxX: 10,
                minY: -10,
                maxY: 10,
                borderData: FlBorderData(show: false),
                gridData: FlGridData(
                  show: true,
                  drawHorizontalLine: true,
                  drawVerticalLine: true,
                  getDrawingHorizontalLine: (value) => const FlLine(color: Colors.white10, strokeWidth: 1),
                  getDrawingVerticalLine: (value) => const FlLine(color: Colors.white10, strokeWidth: 1),
                ),
                titlesData: const FlTitlesData(show: false),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
