import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../models/complaint.dart';
import '../../models/discussion.dart';
import '../../models/poll.dart';
import '../../services/complaint_service.dart';
import '../../services/discussion_service.dart';
import '../../services/poll_service.dart';
import '../../state/auth_controller.dart';
import '../../state/guest_identity.dart';
import '../../theme/app_theme.dart';
import '../widgets/complaint_body.dart';
import 'account_screen.dart';
import 'complaint_detail_screen.dart';
import 'discussion_thread_screen.dart';
import 'file_complaint_screen.dart';
import 'poll_vote_screen.dart';
import '../../realtime/live_refresh.dart';
import '../widgets/format.dart';
import '../widgets/notification_bell.dart';
import '../widgets/eps_loader.dart';

/// The signed-in home: a greeting, a search bar, a row of category chips, and a swipeable
/// stack of big cards — your latest feedback, open discussions and polls.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

enum _Kind { all, feedback, discussion, poll }

class _Card {
  const _Card({
    required this.kind,
    required this.tag,
    required this.title,
    required this.meta,
    required this.badge,
    required this.icon,
    required this.look,
    required this.route,
    this.cta = 'See more',
    this.complaintId,
  });

  final _Kind kind;
  final String tag;
  final String title;
  final String meta;
  final String badge;
  final IconData icon;
  final _Look look;
  final String route;
  final String cta;

  /// Set for a feedback card: it opens the slide-up detail sheet instead of a page.
  final int? complaintId;

  List<Color> get colors => look.colors;
}

/// How one kind of card is painted: its gradient, the colour of its text, the glow behind it
/// and the colour of the round arrow. Feedback is light blue, discussions orange, surveys
/// yellow — the same three colours as the citizen web app.
class _Look {
  const _Look({
    required this.colors,
    required this.ink,
    required this.glow,
    required this.arrow,
  });

  final List<Color> colors;
  final Color ink;
  final Color glow;
  final Color arrow;

  /// Light blue (#68AFF1) — feedback.
  static const feedback = _Look(
    colors: [
      Color(0xFF9CCBF6),
      AppTheme.feedbackColor,
      AppTheme.feedbackDeep,
    ],
    ink: Color(0xFF10304F),
    glow: Color(0x40FFFFFF),
    arrow: Colors.white,
  );

  /// Orange (#DB812C) — discussions.
  static const discussion = _Look(
    colors: [
      Color(0xFFEBA565),
      AppTheme.discussionColor,
      AppTheme.discussionDeep,
    ],
    ink: Color(0xFF2B1500),
    glow: Color(0x40FFFFFF),
    arrow: Colors.white,
  );

  /// Yellow (#EEC336) — surveys.
  static const survey = _Look(
    colors: [Color(0xFFF6DB78), AppTheme.surveyColor, AppTheme.surveyDeep],
    ink: Color(0xFF2A2100),
    glow: Color(0x40FFFFFF),
    arrow: Colors.white,
  );
}

class _HomeScreenState extends State<HomeScreen> {
  final _search = TextEditingController();
  final _pageCtrl = PageController(viewportFraction: 0.82);
  _Kind _kind = _Kind.all;
  String _query = '';
  late Future<List<_Card>> _future;
  LiveRefresh? _live;

  @override
  void initState() {
    super.initState();
    _future = _load();
    // the cards (your feedback, discussions, surveys) follow what happens, and the carousel stays where it is
    _live = LiveRefresh.listen(
      context,
      const ['complaint', 'discussion', 'poll'],
      _refreshQuietly,
    );
  }

  @override
  void dispose() {
    _live?.cancel();
    _search.dispose();
    _pageCtrl.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _future = _load();
    });
    await _future;
  }

  /// Loads the cards again without replacing what is on screen with the loader, so the carousel
  /// stays where it is (the page you scrolled to is kept) and just updates its cards. Used after
  /// a sheet closes; [_reload] is the one that starts over.
  Future<void> _refreshQuietly() async {
    final cards = await _load();
    if (!mounted) return;
    setState(() {
      _future = Future.value(cards);
    });
  }

  /// Your feedback, the discussions and the polls, each turned into one card. A list that
  /// fails to load just contributes nothing, so the others still show.
  Future<List<_Card>> _load() async {
    final complaints = context
        .read<ComplaintService>()
        .myComplaints()
        .catchError((_) => <Complaint>[]);
    final discussions = context
        .read<DiscussionService>()
        .list()
        .catchError((_) => <Discussion>[]);
    final polls = context
        .read<PollService>()
        .list(context.read<GuestIdentity>().token)
        .catchError((_) => <Poll>[]);
    final results = await Future.wait([complaints, discussions, polls]);
    final fb = (results[0] as List<Complaint>).take(6).map(
          (c) => _Card(
            kind: _Kind.feedback,
            tag: 'Feedback',
            title: c.referenceNo,
            meta: c.content.isEmpty
                ? 'Filed ${timeAgo(c.createdAt)}'
                : c.content.replaceAll('\n', ' '),
            badge:
                '${(complaintProgress(c.status) * 100).round()}% · ${c.status}',
            icon: Icons.description_rounded,
            look: _Look.feedback,
            route: '/my-complaints/${c.id}',
            complaintId: c.id,
          ),
        );
    final dc = (results[1] as List<Discussion>).take(6).map(
          (d) => _Card(
            kind: _Kind.discussion,
            tag: 'Discussion',
            title: d.title,
            meta: d.description.isEmpty
                ? 'Opened ${timeAgo(d.createdAt)}'
                : d.description.replaceAll('\n', ' '),
            badge: '${d.commentCount} comment${d.commentCount == 1 ? '' : 's'}',
            icon: Icons.forum_rounded,
            look: _Look.discussion,
            route: '/discussions/${d.id}',
          ),
        );
    final pl = (results[2] as List<Poll>).take(6).map(
          (p) => _Card(
            kind: _Kind.poll,
            tag: 'Survey',
            title: p.question,
            meta: p.hasVoted
                ? 'You answered'
                : (p.isOpen ? 'Tap to answer' : 'Closed'),
            badge: '${p.totalVotes} response${p.totalVotes == 1 ? '' : 's'}',
            icon: Icons.bar_chart_rounded,
            look: _Look.survey,
            route: '/polls/${p.id}',
          ),
        );
    return [...fb, ...dc, ...pl];
  }

  /// Every card opens as a sheet that slides up over the home page.
  void _open(_Card c) {
    final route = c.route;
    if (c.complaintId != null) {
      showComplaintSheet(context, c.complaintId!);
    } else if (route.startsWith('/discussions/')) {
      showDiscussionSheet(context, int.parse(route.split('/').last)).then((_) {
        _refreshQuietly();
      });
    } else if (route.startsWith('/polls/')) {
      showPollSheet(context, int.parse(route.split('/').last)).then((_) {
        _refreshQuietly();
      });
    } else if (route == '/file-complaint') {
      showFileFeedbackSheet(context).then((filed) {
        if (filed) _refreshQuietly();
      });
    } else {
      context.push(route);
    }
  }

  List<_Card> _visible(List<_Card> all) {
    final q = _query.trim().toLowerCase();
    final list = all.where((c) {
      if (_kind != _Kind.all && c.kind != _kind) return false;
      return q.isEmpty ||
          c.title.toLowerCase().contains(q) ||
          c.meta.toLowerCase().contains(q);
    }).toList();
    // the "start something new" card leads the feedback and all views
    if (q.isEmpty && (_kind == _Kind.all || _kind == _Kind.feedback)) {
      list.insert(
        0,
        const _Card(
          kind: _Kind.feedback,
          tag: 'New',
          title: 'File new feedback',
          meta:
              'Tell us what is wrong — it is routed to the right office for you.',
          badge: 'Signed in · no code needed',
          icon: Icons.add_comment_rounded,
          look: _Look.feedback,
          route: '/file-complaint',
          cta: 'Get started',
        ),
      );
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final name = auth.user?.firstname ?? 'there';

    return Scaffold(
      backgroundColor: AppTheme.accent,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- greeting ----
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 14, 22, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, $name',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            height: 1.15,
                            color: AppTheme.ink,
                          ),
                        ),
                        const Text(
                          'Welcome to ePS',
                          style: TextStyle(fontSize: 13, color: AppTheme.mute),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => showProfileSheet(context),
                    child: CircleAvatar(
                      radius: 24,
                      backgroundColor: AppTheme.primary,
                      child: Text(
                        auth.user?.initials ?? '?',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ---- search + the bell ----
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 54,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: AppTheme.line),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.deep.withValues(alpha: 0.07),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: TextField(
                        controller: _search,
                        onChanged: (v) => setState(() {
                          _query = v;
                          if (_pageCtrl.hasClients) _pageCtrl.jumpToPage(0);
                        }),
                        decoration: const InputDecoration(
                          hintText: 'Search',
                          prefixIcon:
                              Icon(Icons.search_rounded, color: AppTheme.ink),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          contentPadding: EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const NotificationBell(iconColor: Colors.white),
                  ),
                ],
              ),
            ),

            // ---- chips ----
            const Padding(
              padding: EdgeInsets.fromLTRB(22, 22, 22, 10),
              child: Text(
                'What would you like to see?',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.ink,
                ),
              ),
            ),
            SizedBox(
              height: 42,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  for (final k in _Kind.values) ...[
                    _Chip(
                      label: switch (k) {
                        _Kind.all => 'All',
                        _Kind.feedback => 'Feedback',
                        _Kind.discussion => 'Discussions',
                        _Kind.poll => 'Surveys',
                      },
                      selected: _kind == k,
                      onTap: () => setState(() {
                        _kind = k;
                        if (_pageCtrl.hasClients) _pageCtrl.jumpToPage(0);
                      }),
                    ),
                    const SizedBox(width: 8),
                  ],
                ],
              ),
            ),

            // ---- the big cards ----
            const SizedBox(height: 14),
            Expanded(
              child: FutureBuilder<List<_Card>>(
                future: _future,
                builder: (context, snap) {
                  // the loader only on the very first load: while the cards load again the old
                  // ones stay, so the carousel is not rebuilt and keeps the page you are on
                  if (snap.connectionState == ConnectionState.waiting &&
                      snap.data == null) {
                    return const EpsLoader();
                  }
                  final cards = _visible(snap.data ?? const []);
                  if (cards.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.search_off_rounded,
                              size: 44,
                              color: AppTheme.mute.withValues(alpha: 0.8),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Nothing here yet',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Try another category or search.',
                              style: TextStyle(color: AppTheme.mute),
                            ),
                            TextButton(
                              onPressed: _reload,
                              child: const Text('Refresh'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  return Column(
                    children: [
                      Expanded(
                        child: PageView.builder(
                          controller: _pageCtrl,
                          itemCount: cards.length,
                          padEnds: false,
                          // let each card's shadow spill over the edge instead of being cut off
                          clipBehavior: Clip.none,
                          itemBuilder: (context, i) => Padding(
                            padding:
                                EdgeInsets.fromLTRB(i == 0 ? 20 : 6, 0, 6, 8),
                            child: _BigCard(
                              card: cards[i],
                              onOpen: () => _open(cards[i]),
                            ),
                          ),
                        ),
                      ),
                      // room for the floating navigation bar
                      const SizedBox(height: 96),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppTheme.primary : Colors.white,
      shape: StadiumBorder(
        side: BorderSide(
          color: selected ? AppTheme.primary : AppTheme.line,
        ),
      ),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : const Color(0xFF4C5C79),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One big card: a coloured scene with a huge faint icon, a tag, the title and a line of
/// detail, and a dark "See more" bar with a round arrow at the bottom.
class _BigCard extends StatelessWidget {
  const _BigCard({required this.card, required this.onOpen});

  final _Card card;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onOpen,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(34),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: card.colors,
          ),
          boxShadow: [
            BoxShadow(
              color: card.colors[1].withValues(alpha: 0.38),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Stack(
          children: [
            // the scene
            Positioned(
              right: -40,
              top: 20,
              child: Icon(
                card.icon,
                size: 230,
                color: card.look.ink.withValues(alpha: 0.12),
              ),
            ),
            Positioned(
              left: -60,
              top: -60,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: card.look.glow,
                ),
              ),
            ),
            // top-right round button
            Positioned(
              right: 16,
              top: 16,
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: card.look.ink.withValues(alpha: 0.16),
                ),
                child: Icon(card.icon, size: 18, color: card.look.ink),
              ),
            ),
            // the text, low on the card
            Positioned(
              left: 20,
              right: 20,
              bottom: 86,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    card.tag,
                    style: TextStyle(
                      color: card.look.ink.withValues(alpha: 0.85),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    card.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: card.look.ink,
                      fontSize: 25,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.star_rounded,
                        size: 16,
                        color: card.look.ink,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          card.badge,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: card.look.ink,
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    card.meta,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: card.look.ink.withValues(alpha: 0.82),
                      fontSize: 12.5,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            // the dark bar
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Container(
                height: 58,
                padding: const EdgeInsets.only(left: 22, right: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF16233A).withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(26),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Center(
                        child: Text(
                          card.cta,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: card.look.arrow,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        color: AppTheme.ink,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
