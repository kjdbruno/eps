import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'router/app_router.dart';
import 'state/auth_controller.dart';
import 'theme/app_theme.dart';

class EpsApp extends StatefulWidget {
  const EpsApp({super.key});

  @override
  State<EpsApp> createState() => _EpsAppState();
}

class _EpsAppState extends State<EpsApp> {
  late final AppRouter _router;

  @override
  void initState() {
    super.initState();
    _router = AppRouter(context.read<AuthController>());
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ePS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router.router,
    );
  }
}
