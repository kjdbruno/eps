const express = require('express');

const { verifyToken, requireRole } = require('../middlewares/AuthMiddleware');

module.exports = (TeamController) => {
    const router = express.Router();

    // Read-only roster — any authenticated staff role. Distinct from Preference > User (super-only
    // CRUD, see UserRoutes.js); this just powers the Dashboard's "who's online" panel.
    router.get('/directory', verifyToken, requireRole('super', 'admin', 'workstation', 'monitoring'), TeamController.getDirectory);

    // Force-logout is deliberately super-only, not admin — the one action on this panel with a
    // real, immediate, no-undo effect on another account.
    router.post('/:id/force-logout', verifyToken, requireRole('super'), TeamController.forceLogout);

    return router;
};
