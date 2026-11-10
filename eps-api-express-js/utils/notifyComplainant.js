const { ComplaintDetail, Citizen, Notification } = require('../models');
const { pushNotifications } = require('./notifySocket');
const transporter = require('./mailer');
const mailFrom = require('./mailFrom');
const { renderNotification } = require('./renderNotification');

// Sent as a branded HTML email (templates/notification.html); the plain text stays as the fallback
// for mail apps that do not show HTML.
const mailComplainant = (to, subject, content, tail) =>
    transporter.sendMail({
        from: mailFrom(),
        to,
        subject,
        text: `${content}\n\n${tail}`,
        html: renderNotification({ subject, content, note: tail }),
    });

// One place to reach whoever filed a complaint, regardless of whether they have an account.
//   - Claimed (ComplaintDetail.userId set): an in-app notification — the row is stored and pushed
//     to any live socket. Always sent.
//   - Guest / staff-filed (userId null): an email to the address captured at filing time, since
//     there's no inbox in the app to write to.
// Best-effort throughout — a mailer hiccup never throws, matching the notifyUser / notifyAdmins
// convention everywhere else in the complaint flow.
//
// Options:
//   emailGuest       (default true)  — gate the guest email. Pass false for routine in-thread
//                                      updates (a staff response, one office finishing its part)
//                                      that shouldn't fill a guest's inbox; an account holder
//                                      still gets the in-app note.
//   alsoEmailAccount (default false) — ALSO email an account holder (at their Citizen.email), on
//                                      top of the in-app note. Used for a status change the
//                                      complainant should get by every channel — completed,
//                                      cancelled, reopened.
const notifyComplainant = async (
    io,
    complaintId,
    content,
    { subject = 'Update on your feedback', emailGuest = true, alsoEmailAccount = false } = {}
) => {
    try {
        const detail = await ComplaintDetail.findOne({ where: { complaintId } });
        if (!detail) return;

        if (detail.userId) {
            await Notification.create({ receiverId: detail.userId, content });
            await pushNotifications(io, detail.userId);

            if (alsoEmailAccount) {
                const citizen = await Citizen.findOne({ where: { userId: detail.userId }, attributes: ['email'] });
                const to = citizen?.email || detail.guestEmail;
                if (to) await mailComplainant(to, subject, content, 'Log in to the app to view the full details of your feedback.');
            }
            return;
        }

        if (emailGuest && detail.guestEmail) {
            await mailComplainant(
                detail.guestEmail,
                subject,
                content,
                "You can view the full details on the Track page using your feedback's reference number and access code."
            );
        }
    } catch (error) {
        console.error(`Failed to notify complainant for complaint ${complaintId}:`, error.message);
    }
};

module.exports = { notifyComplainant };
